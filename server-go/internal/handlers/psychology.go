package handlers

import (
	"net/http"

	"comeback.ai/server-go/internal/auth"
	"comeback.ai/server-go/internal/db"
	"comeback.ai/server-go/internal/middleware"
	"comeback.ai/server-go/internal/models"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var psychPrinciples = map[string]map[string]interface{}{
	"tiny-habits":   {"name": "tiny-habits", "title": "Tiny Habits", "description": "Start absurdly small to build momentum."},
	"implementation-intentions": {"name": "implementation-intentions", "title": "Implementation Intentions", "description": "Pair an action with a time and place."},
	"growth-mindset": {"name": "growth-mindset", "title": "Growth Mindset", "description": "Abilities grow through effort."},
	"habit-stacking": {"name": "habit-stacking", "title": "Habit Stacking", "description": "Attach a new habit to an existing one."},
	"self-compassion": {"name": "self-compassion", "title": "Self-Compassion", "description": "Treat setbacks with kindness."},
}

func PsychologyPrinciples(w http.ResponseWriter, r *http.Request) {
	out := make([]map[string]interface{}, 0, len(psychPrinciples))
	for _, p := range psychPrinciples {
		out = append(out, p)
	}
	middleware.Success(w, out)
}

func PsychologyPrinciple(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	p, ok := psychPrinciples[name]
	if !ok {
		middleware.Error(w, http.StatusNotFound, "Principle not found")
		return
	}
	middleware.Success(w, p)
}

func PsychologyIntention(w http.ResponseWriter, r *http.Request) {
	var body struct {
		GoalTitle string `json:"goalTitle"`
		Obstacle  string `json:"obstacle"`
	}
	_ = decodeBody(r, &body)
	if body.GoalTitle == "" {
		middleware.Error(w, http.StatusBadRequest, "Goal title required")
		return
	}
	intention := map[string]interface{}{
		"goalTitle":  body.GoalTitle,
		"obstacle":   body.Obstacle,
		"intention":  "After I [existing routine], I will [small action toward " + body.GoalTitle + "].",
		"ifObstacle": "If I encounter " + orDefault(body.Obstacle, "resistance") + ", I will take one tiny step anyway.",
	}
	middleware.Success(w, intention)
}

func PsychologyBurnoutCheck(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := auth.GetUserID(r)
	var mem models.UserMemory
	_ = db.Collection("usermemory").FindOne(ctx, bson.M{"user": uid}).Decode(&mem)
	risk := mem.ChallengePreference
	if risk == "" {
		risk = "low"
	}
	middleware.Success(w, map[string]interface{}{
		"burnoutRisk": risk,
		"recommendation": "Take regular breaks and keep tasks small.",
	})
}

func PsychologyGrowthMindset(w http.ResponseWriter, r *http.Request) {
	obstacle := queryString(r, "obstacle")
	middleware.Success(w, map[string]interface{}{
		"obstacle": obstacle,
		"prompt":   "What if this obstacle is just information? What could you learn from it?",
	})
}

func PsychologyConsistencyPlan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := auth.GetUserID(r)
	var user models.User
	_ = db.Collection("users").FindOne(ctx, bson.M{"_id": uid}).Decode(&user)
	middleware.Success(w, map[string]interface{}{
		"streak":      user.Streak,
		"plan":        []string{"Anchor one task to an existing daily habit.", "Keep the bar low on hard days.", "Celebrate the streak."},
		"encouragement": getEncouragement(),
	})
}

func PsychologyReframe(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Obstacle string `json:"obstacle"`
	}
	_ = decodeBody(r, &body)
	if body.Obstacle == "" {
		middleware.Error(w, http.StatusBadRequest, "Obstacle description required")
		return
	}
	middleware.Success(w, map[string]interface{}{
		"original":   body.Obstacle,
		"reframe":    "This is a moment of effort, not a sign of failure. What's one small thing you can do next?",
		"message":    "Keep going — you've got this!",
	})
}

func PsychologyEncouragement(w http.ResponseWriter, r *http.Request) {
	middleware.Success(w, map[string]interface{}{"message": getEncouragement()})
}

func PsychologyReflectionPrompt(w http.ResponseWriter, r *http.Request) {
	t := queryString(r, "type")
	if t == "" {
		t = "daily"
	}
	idx := queryInt(r, "index", -1)
	middleware.Success(w, reflectionPromptData(t, idx))
}

func reflectionPromptData(t string, idx int) map[string]interface{} {
	prompts := map[string][]string{
		"daily":   {"What's one win you can celebrate today?", "What's the smallest step you can take right now?", "What are you most grateful for today?"},
		"weekly":  {"What progress are you most proud of this week?", "What slowed you down, and how could you address it?", "What's your single focus for next week?"},
	}
	list := prompts[t]
	if list == nil {
		list = prompts["daily"]
	}
	if idx >= 0 && idx < len(list) {
		return map[string]interface{}{"prompt": list[idx], "type": t}
	}
	return map[string]interface{}{"prompt": list[timeNow().Second()%len(list)], "type": t}
}

func PsychologyRecoveryStrategy(w http.ResponseWriter, r *http.Request) {
	middleware.Success(w, map[string]interface{}{
		"strategy": "Rebuild gradually. One task today, then two tomorrow.",
		"steps":    []string{"Acknowledge the gap without guilt.", "Pick the easiest task.", "Restart the streak."},
	})
}

func PsychologyRecoveryPlan(w http.ResponseWriter, r *http.Request) {
	var body struct {
		DaysMissed int `json:"daysMissed"`
	}
	_ = decodeBody(r, &body)
	ctx := r.Context()
	uid := auth.GetUserID(r)
	var user models.User
	_ = db.Collection("users").FindOne(ctx, bson.M{"_id": uid}).Decode(&user)
	days := body.DaysMissed
	if days == 0 && !user.LastActiveDate.IsZero() {
		days = maxInt(0, int(timeNow().Sub(user.LastActiveDate).Hours()/24)-1)
	}
	middleware.Success(w, map[string]interface{}{
		"daysMissed":   days,
		"steps":        []string{"Start with one tiny task today.", "Reconnect with your most important goal.", "Set a 5-minute daily ritual."},
		"encouragement": getEncouragement(),
	})
}

func PsychologyChallenge(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	uid := auth.GetUserID(r)
	var mem models.UserMemory
	_ = db.Collection("usermemory").FindOne(ctx, bson.M{"user": uid}).Decode(&mem)
	pref := mem.ChallengePreference
	if pref == "" {
		pref = "moderate"
	}
	challenges := map[string]map[string]interface{}{
		"stretch":  {"title": "Double Down", "description": "Tackle two high-priority tasks today.", "difficulty": "stretch"},
		"moderate": {"title": "Steady Climb", "description": "Complete one goal-linked task and one habit task.", "difficulty": "moderate"},
		"gentle":   {"title": "Gentle Start", "description": "Do one small task to keep your streak alive.", "difficulty": "gentle"},
	}
	middleware.Success(w, challenges[pref])
}

func PsychologyAnalysis(w http.ResponseWriter, r *http.Request) {
	middleware.Success(w, map[string]interface{}{
		"recommendedCoachingStyle": map[string]interface{}{"focus": "growth"},
		"performanceTrend":         map[string]interface{}{"trend": "stable"},
		"dominantTimeOfDay":        "morning",
	})
}

func PsychologyLearningCycle(w http.ResponseWriter, r *http.Request) {
	middleware.Success(w, map[string]interface{}{"status": "ok", "cyclesRun": 1})
}

func PsychologyAdaptiveInsights(w http.ResponseWriter, r *http.Request) {
	middleware.Success(w, []interface{}{})
}

var _ = primitive.NilObjectID
