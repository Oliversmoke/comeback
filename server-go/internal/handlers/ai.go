package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"comeback.ai/server-go/internal/auth"
	"comeback.ai/server-go/internal/db"
	"comeback.ai/server-go/internal/middleware"
	"comeback.ai/server-go/internal/models"
	"comeback.ai/server-go/internal/services"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type aiTask struct {
	Title           string `json:"title"`
	Description     string `json:"description"`
	EstimatedMinutes int   `json:"estimatedMinutes"`
	Difficulty      string `json:"difficulty"`
	Category        string `json:"category"`
	GoalID          string `json:"goalId"`
}

func AIGenerateTasks(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := auth.GetUserID(r)
	var user models.User
	_ = db.Collection("users").FindOne(ctx, bson.M{"_id": uid}).Decode(&user)
	goals, _ := loadGoals(ctx, uid)
	recent, _ := loadRecentTasks(ctx, uid, 20)

	var sb strings.Builder
	sb.WriteString("Create SMART daily tasks.\n")
	for _, g := range goals {
		sb.WriteString("- " + g.Title + " (id: " + g.ID.Hex() + ")\n")
	}
	if len(recent) > 0 {
		sb.WriteString("Recent Tasks:\n")
		for _, t := range recent {
			sb.WriteString("- " + t.Title + "\n")
		}
	}

	raw, err := services.GenerateDailyTasks(ctx, sb.String())
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "AI generation failed")
		return
	}

	tasks := parseAITasks(raw)
	created := make([]models.TaskOut, 0, len(tasks))
	for _, td := range tasks {
		task := models.Task{
			User:         uid,
			Title:        td.Title,
			Description:  td.Description,
			Priority:     difficultyToPriority(td.Difficulty),
			IsAiGenerated: true,
			IsDailyTask:  true,
			DateFor:      timeNow(),
			XpReward:     difficultyToXp(td.Difficulty),
			AiContext:    models.AiContext{Reasoning: "AI-generated based on goal analysis", Difficulty: td.Difficulty, Category: td.Category, TimeEstimate: td.EstimatedMinutes},
		}
		if td.GoalID != "" {
			if oid, e := primitive.ObjectIDFromHex(td.GoalID); e == nil {
				task.Goal = oid
			}
		} else if len(goals) == 1 {
			task.Goal = goals[0].ID
		}
		res, insErr := db.Collection("tasks").InsertOne(ctx, task)
		if insErr == nil {
			task.ID = res.InsertedID.(primitive.ObjectID)
			created = append(created, populateTaskOut(ctx, task))
		}
	}

	services.RecordActivity(uid, "ai_tasks_generated", "Generated AI daily tasks")
	middleware.Success(w, map[string]interface{}{
		"tasks": created,
		"recommendations": map[string]string{"coachingFocus": "growth", "performanceTrend": "stable"},
	})
}

func AIInsights(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := auth.GetUserID(r)
	var user models.User
	_ = db.Collection("users").FindOne(ctx, bson.M{"_id": uid}).Decode(&user)
	goals, _ := loadGoals(ctx, uid)
	tasks, _ := loadRecentTasks(ctx, uid, 30)
	groupCount, _ := db.Collection("groups").CountDocuments(ctx, bson.M{"members.user": uid})

	var sb strings.Builder
	sb.WriteString("Productivity data: user with " + itoa(user.Level) + " level, " + itoa(user.Xp) + " XP, " + itoa(user.Streak) + " streak, " + itoa(user.CompletedTasks) + " tasks completed.\n")
	sb.WriteString("Goals: " + itoa(len(goals)) + ", Tasks: " + itoa(len(tasks)) + ", Groups: " + itoa(int(groupCount)) + ".\n")
	sb.WriteString("Provide an insight, a suggestion and encouragement.")

	raw, err := services.GenerateInsights(ctx, sb.String())
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "AI insights failed")
		return
	}

	var insight map[string]interface{}
	if e := json.Unmarshal([]byte(cleanJSON(raw)), &insight); e != nil {
		insight = map[string]interface{}{"insight": raw, "suggestion": "", "encouragement": ""}
	}
	services.RecordActivity(uid, "ai_insight_viewed", "Viewed AI productivity insights")
	middleware.Success(w, insight)
}

func AIChat(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Prompt  string                 `json:"prompt"`
		Context map[string]interface{} `json:"context"`
	}
	if err := decodeBody(r, &body); err != nil || body.Prompt == "" {
		middleware.Error(w, http.StatusBadRequest, "Prompt is required")
		return
	}
	ctx := r.Context()
	uid := auth.GetUserID(r)
	var user models.User
	_ = db.Collection("users").FindOne(ctx, bson.M{"_id": uid}).Decode(&user)
	goals, _ := loadGoals(ctx, uid)

	system := "You are the comeback.AI coach, a friendly motivational productivity assistant. " +
		user.Username + ", Level " + itoa(user.Level) + ", " + itoa(user.Xp) + " XP, " +
		itoa(user.Streak) + "-day streak, " + itoa(user.CompletedTasks) + " tasks completed. " +
		"Active goals: " + itoa(len(goals)) + ". Be supportive and concise."

	resp, err := services.ChatWithCoach(ctx, system, body.Prompt)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "AI chat failed")
		return
	}
	services.RecordActivity(uid, "ai_chat", "AI Coach chat")
	middleware.Success(w, map[string]interface{}{
		"response":     resp,
		"encouragement": getEncouragement(),
	})
}

func AIGroupAdapt(w http.ResponseWriter, r *http.Request) {
	var body struct {
		GroupID string `json:"groupId"`
	}
	if err := decodeBody(r, &body); err != nil || body.GroupID == "" {
		middleware.Error(w, http.StatusBadRequest, "Group ID required")
		return
	}
	ctx := r.Context()
	gid, err := primitive.ObjectIDFromHex(body.GroupID)
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid group id")
		return
	}
	var group models.Group
	if err := db.Collection("groups").FindOne(ctx, bson.M{"_id": gid}).Decode(&group); err != nil {
		middleware.Error(w, http.StatusNotFound, "Group not found")
		return
	}
	isMember := false
	for _, m := range group.Members {
		if m.User == auth.GetUserID(r) {
			isMember = true
		}
	}
	if !isMember {
		middleware.Error(w, http.StatusForbidden, "Not a member")
		return
	}
	suggestions := []string{
		"Schedule a 15-minute daily standup for the group.",
		"Set a shared weekly goal and track progress together.",
		"Celebrate streaks publicly to boost accountability.",
	}
	middleware.Success(w, map[string]interface{}{
		"suggestions": suggestions,
		"group":       map[string]interface{}{"id": group.ID.Hex(), "name": group.Name, "totalXp": group.TotalXp, "streak": group.Streak, "memberCount": len(group.Members)},
	})
}

func AIRecoveryPlan(w http.ResponseWriter, r *http.Request) {
	var body struct {
		DaysMissed int `json:"daysMissed"`
	}
	_ = decodeBody(r, &body)
	ctx := r.Context()
	uid := auth.GetUserID(r)
	var user models.User
	_ = db.Collection("users").FindOne(ctx, bson.M{"_id": uid}).Decode(&user)
	days := body.DaysMissed
	if days == 0 {
		if !user.LastActiveDate.IsZero() {
			days = maxInt(0, int(timeNow().Sub(user.LastActiveDate).Hours()/24)-1)
		}
	}
	plan := map[string]interface{}{
		"daysMissed": days,
		"steps": []string{
			"Start with one tiny task today — momentum beats intensity.",
			"Reconnect with your most important goal.",
			"Set a 5-minute daily ritual to rebuild the habit.",
		},
		"encouragement": getEncouragement(),
	}
	middleware.Success(w, plan)
}

func AIReflectionPrompt(w http.ResponseWriter, r *http.Request) {
	t := queryString(r, "type")
	if t == "" {
		t = "daily"
	}
	prompts := map[string][]string{
		"daily": {
			"What's one win you can celebrate today?",
			"What's the smallest step you can take right now?",
			"What are you most grateful for today?",
		},
		"weekly": {
			"What progress are you most proud of this week?",
			"What slowed you down, and how could you address it?",
			"What's your single focus for next week?",
		},
	}
	list := prompts[t]
	if list == nil {
		list = prompts["daily"]
	}
	idx := queryInt(r, "index", -1)
	if idx >= 0 && idx < len(list) {
		middleware.Success(w, map[string]interface{}{"prompt": list[idx], "type": t})
		return
	}
	middleware.Success(w, map[string]interface{}{"prompt": list[timeNow().Second()%len(list)], "type": t})
}

func AIChallenge(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := auth.GetUserID(r)
	var mem models.UserMemory
	_ = db.Collection("usermemory").FindOne(ctx, bson.M{"user": uid}).Decode(&mem)
	pref := mem.ChallengePreference
	if pref == "" {
		pref = "moderate"
	}
	challenges := map[string]map[string]interface{}{
		"stretch": {"title": "Double Down", "description": "Tackle two high-priority tasks today.", "difficulty": "stretch"},
		"moderate": {"title": "Steady Climb", "description": "Complete one goal-linked task and one habit task.", "difficulty": "moderate"},
		"gentle": {"title": "Gentle Start", "description": "Do one small task to keep your streak alive.", "difficulty": "gentle"},
	}
	middleware.Success(w, challenges[pref])
}

func AITrackWin(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Description string `json:"description"`
		Category    string `json:"category"`
		Impact      string `json:"impact"`
	}
	if err := decodeBody(r, &body); err != nil || body.Description == "" {
		middleware.Error(w, http.StatusBadRequest, "Win description required")
		return
	}
	ctx := r.Context()
	uid := auth.GetUserID(r)
	mem := models.UserMemory{
		User:          uid,
		ChallengePreference: "moderate",
		InteractionCount: 1,
		LastInteractionSummary: body.Description,
	}
	res, err := db.Collection("usermemory").UpdateOne(ctx, bson.M{"user": uid},
		bson.M{"$set": bson.M{"lastInteractionSummary": body.Description, "$inc": bson.M{"interactionCount": 1}}},
		options.Update().SetUpsert(true))
	if err != nil && res == nil {
		_ = mem
	}
	services.RecordActivity(uid, "ai_chat", "Tracked win: "+body.Description)
	middleware.Success(w, map[string]interface{}{
		"memory":         map[string]interface{}{"lastInteractionSummary": body.Description},
		"encouragement":  getEncouragement(),
	})
}

func AIEncouragement(w http.ResponseWriter, r *http.Request) {
	middleware.Success(w, map[string]interface{}{"message": getEncouragement()})
}

// --- helpers -------------------------------------------------------------

func getEncouragement() string {
	list := []string{
		"You're showing up — that's what matters most. Keep going!",
		"Small steps every day beat big steps once in a while.",
		"Your streak is proof you've got this. Don't break the chain!",
		"Progress over perfection. You're doing better than you think.",
	}
	return list[timeNow().Second()%len(list)]
}

func difficultyToPriority(d string) string {
	switch d {
	case "hard":
		return "high"
	case "easy":
		return "low"
	default:
		return "medium"
	}
}

func difficultyToXp(d string) int {
	switch d {
	case "hard":
		return 20
	case "medium":
		return 15
	default:
		return 10
	}
}

func parseAITasks(raw string) []aiTask {
	raw = cleanJSON(raw)
	start := strings.Index(raw, "[")
	end := strings.LastIndex(raw, "]")
	if start >= 0 && end > start {
		raw = raw[start : end+1]
	}
	var tasks []aiTask
	if err := json.Unmarshal([]byte(raw), &tasks); err != nil {
		return nil
	}
	return tasks
}

func cleanJSON(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "```json")
	raw = strings.TrimPrefix(raw, "```")
	raw = strings.TrimSuffix(raw, "```")
	return strings.TrimSpace(raw)
}

func loadGoals(ctx context.Context, uid primitive.ObjectID) ([]models.Goal, error) {
	cur, err := db.Collection("goals").Find(ctx, bson.M{"user": uid, "status": "active"})
	if err != nil {
		return nil, err
	}
	var goals []models.Goal
	_ = cur.All(ctx, &goals)
	return goals, nil
}

func loadRecentTasks(ctx context.Context, uid primitive.ObjectID, n int64) ([]models.Task, error) {
	cur, err := db.Collection("tasks").Find(ctx, bson.M{"user": uid},
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(n))
	if err != nil {
		return nil, err
	}
	var tasks []models.Task
	_ = cur.All(ctx, &tasks)
	return tasks, nil
}

func itoa(n int) string {
	return strings.TrimSpace(intToStr(n))
}

func intToStr(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		b[i] = '-'
	}
	return string(b[i:])
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
