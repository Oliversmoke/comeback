package handlers

import (
	"context"
	"net/http"
	"time"

	"comeback.ai/server-go/internal/auth"
	"comeback.ai/server-go/internal/db"
	"comeback.ai/server-go/internal/middleware"
	"comeback.ai/server-go/internal/models"
	"comeback.ai/server-go/internal/services"

	"github.com/go-chi/chi/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func populateTaskOut(ctx context.Context, task models.Task) models.TaskOut {
	out := task.ToOut()
	if task.Goal != primitive.NilObjectID {
		var g models.Goal
		if err := db.Collection("goals").FindOne(ctx, bson.M{"_id": task.Goal}).Decode(&g); err == nil {
			out.Goal = &models.GoalMin{ID: g.ID, Title: g.Title, Category: g.Category}
		}
	}
	if task.Group != primitive.NilObjectID {
		var g models.Group
		if err := db.Collection("groups").FindOne(ctx, bson.M{"_id": task.Group}).Decode(&g); err == nil {
			out.Group = &models.GroupMin{ID: g.ID, Name: g.Name}
		}
	}
	return out
}

func TasksList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	filter := bson.M{"user": auth.GetUserID(r)}
	if s := queryString(r, "status"); s != "" {
		filter["status"] = s
	}
	if p := queryString(r, "priority"); p != "" {
		filter["priority"] = p
	}
	if g := queryString(r, "goalId"); g != "" {
		if oid, err := primitive.ObjectIDFromHex(g); err == nil {
			filter["goal"] = oid
		}
	}
	if g := queryString(r, "groupId"); g != "" {
		if oid, err := primitive.ObjectIDFromHex(g); err == nil {
			filter["group"] = oid
		}
	}
	if r.URL.Query().Get("isDaily") == "true" {
		filter["isDailyTask"] = true
	}
	if df := queryString(r, "dateFor"); df != "" {
		if t, err := parseDate(df); err == nil {
			start := startOfDay(t)
			filter["dateFor"] = bson.M{"$gte": start, "$lte": endOfDay(t)}
		}
	}

	page := queryInt(r, "page", 1)
	limit := queryInt(r, "limit", 50)
	if limit > 200 {
		limit = 200
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "priority", Value: -1}, {Key: "dueDate", Value: 1}, {Key: "createdAt", Value: -1}}).
		SetSkip(int64((page - 1) * limit)).SetLimit(int64(limit))
	cur, err := db.Collection("tasks").Find(ctx, filter, opts)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to load tasks")
		return
	}
	var tasks []models.Task
	_ = cur.All(ctx, &tasks)

	out := make([]models.TaskOut, 0, len(tasks))
	for _, t := range tasks {
		out = append(out, populateTaskOut(ctx, t))
	}
	_, _ = db.Collection("tasks").CountDocuments(ctx, filter)
	middleware.Success(w, out)
}

func TasksToday(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	today := startOfDay(timeNow())
	tomorrow := today.Add(24 * time.Hour)
	filter := bson.M{
		"user":  auth.GetUserID(r),
		"status": bson.M{"$in": []string{"pending", "in_progress", "pending_review"}},
		"$or": []bson.M{
			{"dueDate": bson.M{"$gte": today, "$lt": tomorrow}},
			{"isDailyTask": true, "dateFor": bson.M{"$gte": today, "$lt": tomorrow}},
			{"dueDate": nil, "status": "pending"},
		},
	}
	opts := options.Find().SetSort(bson.D{{Key: "priority", Value: -1}, {Key: "createdAt", Value: 1}})
	cur, err := db.Collection("tasks").Find(ctx, filter, opts)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to load tasks")
		return
	}
	var tasks []models.Task
	_ = cur.All(ctx, &tasks)
	out := make([]models.TaskOut, 0, len(tasks))
	for _, t := range tasks {
		out = append(out, populateTaskOut(ctx, t))
	}
	middleware.Success(w, out)
}

func TaskGet(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid task id")
		return
	}
	var task models.Task
	if err := db.Collection("tasks").FindOne(ctx, bson.M{"_id": id, "user": auth.GetUserID(r)}).Decode(&task); err != nil {
		middleware.Error(w, http.StatusNotFound, "Task not found")
		return
	}
	middleware.Success(w, populateTaskOut(ctx, task))
}

func TaskCreate(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Title        string `json:"title"`
		Description  string `json:"description"`
		Priority     string `json:"priority"`
		Status       string `json:"status"`
		DueDate      string `json:"dueDate"`
		GoalID       string `json:"goalId"`
		GroupID      string `json:"groupId"`
		XpReward     int    `json:"xpReward"`
		IsAiGenerated bool  `json:"isAiGenerated"`
	}
	if err := decodeBody(r, &body); err != nil || body.Title == "" {
		middleware.Error(w, http.StatusBadRequest, "Task title is required")
		return
	}
	ctx := r.Context()
	task := models.Task{
		User:         auth.GetUserID(r),
		Title:        body.Title,
		Description:  body.Description,
		Priority:     orDefault(body.Priority, "medium"),
		Status:       orDefault(body.Status, "pending"),
		XpReward:     body.XpReward,
		IsAiGenerated: body.IsAiGenerated,
	}
	if body.GoalID != "" {
		if oid, err := primitive.ObjectIDFromHex(body.GoalID); err == nil {
			task.Goal = oid
		}
	}
	if body.GroupID != "" {
		if oid, err := primitive.ObjectIDFromHex(body.GroupID); err == nil {
			task.Group = oid
			task.IsGroupTask = true
		}
	}
	if body.DueDate != "" {
		if t, err := parseDate(body.DueDate); err == nil {
			task.DueDate = t
		}
	}
	if task.XpReward == 0 {
		task.XpReward = 10
	}
	task.CreatedAt = timeNow()
	task.UpdatedAt = timeNow()
	res, err := db.Collection("tasks").InsertOne(ctx, task)
	if err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to create task")
		return
	}
	task.ID = res.InsertedID.(primitive.ObjectID)
	middleware.SuccessWithStatus(w, http.StatusCreated, populateTaskOut(ctx, task))
}

func TaskUpdate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid task id")
		return
	}
	var body map[string]interface{}
	if err := decodeBody(r, &body); err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	allowed := []string{"title", "description", "priority", "status", "dueDate", "scheduledDate", "xpReward"}
	updates := bson.M{}
	for _, k := range allowed {
		if v, ok := body[k]; ok {
			updates[k] = v
		}
	}

	var existing models.Task
	if err := db.Collection("tasks").FindOne(ctx, bson.M{"_id": id, "user": auth.GetUserID(r)}).Decode(&existing); err != nil {
		middleware.Error(w, http.StatusNotFound, "Task not found")
		return
	}
	wasCompleted := updates["status"] == "completed" && existing.Status != "completed"

	if updates["status"] == "completed" {
		updates["completedAt"] = timeNow()
	}

	res := db.Collection("tasks").FindOneAndUpdate(ctx, bson.M{"_id": id, "user": auth.GetUserID(r)},
		bson.M{"$set": updates}, mongoOptsAfter())
	var task models.Task
	if err := res.Decode(&task); err != nil {
		middleware.Error(w, http.StatusInternalServerError, "Failed to update task")
		return
	}

	if wasCompleted {
		streak, _ := services.UpdateStreak(ctx, task.User)
		_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": task.User}, bson.M{"$inc": bson.M{"completedTasks": 1}})
		xp, _ := services.AwardXp(ctx, task.User, task.XpReward, "task_completed")
		awardGoalProgress(ctx, task.Goal, 5)
		services.RecordActivity(task.User, "task_completed", task.Title)
		checkAchievements(ctx, task.User)
		middleware.Success(w, map[string]interface{}{"task": populateTaskOut(ctx, task), "xp": xp, "streak": streak})
		return
	}
	middleware.Success(w, populateTaskOut(ctx, task))
}

func TaskComplete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid task id")
		return
	}
	var task models.Task
	if err := db.Collection("tasks").FindOne(ctx, bson.M{"_id": id, "user": auth.GetUserID(r)}).Decode(&task); err != nil {
		middleware.Error(w, http.StatusNotFound, "Task not found")
		return
	}
	if task.Status == "completed" {
		middleware.Error(w, http.StatusBadRequest, "Task already completed")
		return
	}

	if task.IsAiGenerated && task.Status != "pending_review" {
		var goal models.Goal
		_ = db.Collection("goals").FindOne(ctx, bson.M{"_id": task.Goal}).Decode(&goal)
		questions, qerr := services.GenerateReviewQuestions(task.Title, goal.Title)
		if qerr != nil {
			questions = []string{"What specific steps did you take to complete this task?", "What did you learn or achieve?", "How does this contribute to your goal?"}
		}
		qa := make([]models.AiReviewQuestion, 0, len(questions))
		for _, q := range questions {
			qa = append(qa, models.AiReviewQuestion{Question: q})
		}
		_, _ = db.Collection("tasks").UpdateOne(ctx, bson.M{"_id": id}, bson.M{
			"$set": bson.M{"status": "pending_review", "aiReview": models.AiReview{Questions: qa, Status: "pending"}},
		})
		middleware.Success(w, map[string]interface{}{"task": populateTaskOut(ctx, task), "needsReview": true, "questions": questions})
		return
	}

	task.Status = "completed"
	task.CompletedAt = timeNow()
	_, _ = db.Collection("tasks").UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{"status": "completed", "completedAt": task.CompletedAt},
	})

	streak, _ := services.UpdateStreak(ctx, task.User)
	_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": task.User}, bson.M{"$inc": bson.M{"completedTasks": 1}})
	xp, _ := services.AwardXp(ctx, task.User, task.XpReward, "task_completed")

	if task.IsGroupTask && task.Group != primitive.NilObjectID {
		_, _ = db.Collection("groups").UpdateOne(ctx, bson.M{"_id": task.Group}, bson.M{
			"$inc": bson.M{"totalXp": task.XpReward},
			"$set": bson.M{"lastActivityDate": timeNow()},
		})
		_, _ = db.Collection("groups").UpdateOne(ctx, bson.M{"_id": task.Group, "members.user": task.User},
			bson.M{"$inc": bson.M{"members.$.xpInGroup": task.XpReward}})
	}
	awardGoalProgress(ctx, task.Goal, 5)
	services.RecordActivity(task.User, "task_completed", task.Title)
	checkAchievements(ctx, task.User)

	middleware.Success(w, map[string]interface{}{"task": populateTaskOut(ctx, task), "xp": xp, "streak": streak})
}

func TaskSubmitProof(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid task id")
		return
	}
	var body struct {
		Answers []struct {
			Question string `json:"question"`
			Answer   string `json:"answer"`
		} `json:"answers"`
		Text string `json:"text"`
	}
	if err := decodeBody(r, &body); err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if len(body.Answers) == 0 && body.Text == "" {
		middleware.Error(w, http.StatusBadRequest, "Proof required")
		return
	}

	var task models.Task
	if err := db.Collection("tasks").FindOne(ctx, bson.M{"_id": id, "user": auth.GetUserID(r)}).Decode(&task); err != nil {
		middleware.Error(w, http.StatusNotFound, "Task not found")
		return
	}
	if task.Status != "pending_review" {
		middleware.Error(w, http.StatusBadRequest, "Task is not pending review")
		return
	}

	answers := body.Answers
	if len(answers) == 0 {
		answers = []struct {
			Question string `json:"question"`
			Answer   string `json:"answer"`
		}{{Question: "Tell me about it", Answer: body.Text}}
	}
	textSummary := body.Text
	if textSummary == "" {
		parts := make([]string, 0, len(answers))
		for _, a := range answers {
			parts = append(parts, a.Answer)
		}
		textSummary = joinStrings(parts, "\n")
	}

	ansStrings := make([]string, 0, len(answers))
	for _, a := range answers {
		ansStrings = append(ansStrings, a.Answer)
	}
	approved, feedback, _ := services.VerifyTaskProof(task.Title, ansStrings)

	aiReview := task.AiReview
	aiReview.Answers = make([]models.AiReviewAnswer, 0, len(answers))
	for _, a := range answers {
		aiReview.Answers = append(aiReview.Answers, models.AiReviewAnswer{Question: a.Question, Answer: a.Answer})
	}

	if approved {
		_, _ = db.Collection("tasks").UpdateOne(ctx, bson.M{"_id": id}, bson.M{
			"$set": bson.M{
				"status": "completed", "completedAt": timeNow(),
				"proof":     models.Proof{Text: textSummary, SubmittedAt: timeNow()},
				"aiReview":  models.AiReview{Answers: aiReview.Answers, Status: "approved", ReviewedAt: timeNow()},
			},
		})
		streak, _ := services.UpdateStreak(ctx, task.User)
		_, _ = db.Collection("users").UpdateOne(ctx, bson.M{"_id": task.User}, bson.M{"$inc": bson.M{"completedTasks": 1}})
		xp, _ := services.AwardXp(ctx, task.User, task.XpReward, "task_completed")
		awardGoalProgress(ctx, task.Goal, 5)
		middleware.Success(w, map[string]interface{}{"task": populateTaskOut(ctx, task), "xp": xp, "streak": streak, "approved": true, "feedback": feedback})
		return
	}

	_, _ = db.Collection("tasks").UpdateOne(ctx, bson.M{"_id": id}, bson.M{
		"$set": bson.M{
			"proof":    models.Proof{Text: textSummary, SubmittedAt: timeNow()},
			"aiReview": models.AiReview{Answers: aiReview.Answers, Status: "rejected", ReviewedAt: timeNow()},
		},
	})
	middleware.Success(w, map[string]interface{}{"task": populateTaskOut(ctx, task), "approved": false, "feedback": orDefault(feedback, "Your proof was not sufficient. Please complete the task and try again.")})
}

func TaskDelete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id, err := primitive.ObjectIDFromHex(chi.URLParam(r, "id"))
	if err != nil {
		middleware.Error(w, http.StatusBadRequest, "Invalid task id")
		return
	}
	res, err := db.Collection("tasks").DeleteOne(ctx, bson.M{"_id": id, "user": auth.GetUserID(r)})
	if err != nil || res.DeletedCount == 0 {
		middleware.Error(w, http.StatusNotFound, "Task not found")
		return
	}
	middleware.Success(w, map[string]string{"message": "Task deleted"})
}

// awardGoalProgress bumps goal progress by up to `inc` (capped at 100).
func awardGoalProgress(ctx context.Context, goalID primitive.ObjectID, inc int) {
	if goalID == primitive.NilObjectID {
		return
	}
	var g models.Goal
	if err := db.Collection("goals").FindOne(ctx, bson.M{"_id": goalID}).Decode(&g); err != nil || g.Progress >= 100 {
		return
	}
	add := inc
	if g.Progress+add > 100 {
		add = 100 - g.Progress
	}
	_, _ = db.Collection("goals").UpdateOne(ctx, bson.M{"_id": goalID}, bson.M{"$inc": bson.M{"progress": add}})
}

func joinStrings(parts []string, sep string) string {
	out := ""
	for i, p := range parts {
		if i > 0 {
			out += sep
		}
		out += p
	}
	return out
}
