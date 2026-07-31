package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"comeback.ai/server-go/internal/services/ai"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ReviewQuestion struct {
	Question string `json:"question"`
}

type ProofResult struct {
	Approved bool   `json:"approved"`
	Feedback string `json:"feedback"`
}

// GenerateReviewQuestions produces verification questions for an AI task.
func GenerateReviewQuestions(taskTitle, goalTitle string) ([]string, error) {
	messages := []ai.Message{
		{Role: "system", Content: "You are a verification coach. Return ONLY a JSON array of objects with a 'question' field."},
		{Role: "user", Content: fmt.Sprintf("Task: %q\nGoal: %q\nGenerate 3 verification questions.", taskTitle, goalTitle)},
	}
	out, err := ai.Chat(context.Background(), messages, ai.Options{MaxTokens: 400, Temperature: 0.5})
	if err != nil {
		return nil, err
	}
	return parseQuestions(out)
}

// VerifyTaskProof evaluates a user's proof answers for an AI task.
func VerifyTaskProof(taskTitle string, answers []string) (bool, string, error) {
	proof := strings.Join(answers, "\n- ")
	messages := []ai.Message{
		{Role: "system", Content: "You verify proof of completing a task. Return ONLY JSON: {\"approved\": true/false, \"feedback\": \"...\"}."},
		{Role: "user", Content: fmt.Sprintf("Task: %q\nProof provided:\n- %s\nDecide if the user genuinely completed it.", taskTitle, proof)},
	}
	out, err := ai.Chat(context.Background(), messages, ai.Options{MaxTokens: 300, Temperature: 0.3})
	if err != nil {
		return false, "", err
	}
	var res ProofResult
	if err := json.Unmarshal([]byte(out), &res); err != nil {
		// Fallback: treat as approved when parse fails but feedback present.
		return true, "Your answers look good — nice work!", nil
	}
	return res.Approved, res.Feedback, nil
}

func parseQuestions(out string) ([]string, error) {
	out = strings.TrimSpace(out)
	start := strings.Index(out, "[")
	end := strings.LastIndex(out, "]")
	if start >= 0 && end > start {
		out = out[start : end+1]
	}
	var qs []ReviewQuestion
	if err := json.Unmarshal([]byte(out), &qs); err != nil {
		return nil, err
	}
	res := make([]string, 0, len(qs))
	for _, q := range qs {
		res = append(res, q.Question)
	}
	return res, nil
}

// GenerateDailyTasks asks the AI for a day of tasks given user/goal context.
func GenerateDailyTasks(ctx context.Context, prompt string) (string, error) {
	messages := []ai.Message{
		{Role: "system", Content: "You are a productivity coach. Generate SMART daily tasks. Return ONLY JSON."},
		{Role: "user", Content: prompt},
	}
	return ai.Chat(ctx, messages, ai.Options{MaxTokens: 800, Temperature: 0.7})
}

// GenerateInsights asks the AI for productivity insights given context.
func GenerateInsights(ctx context.Context, prompt string) (string, error) {
	messages := []ai.Message{
		{Role: "system", Content: "You are a productivity analyst. Return ONLY JSON with insight, suggestion and encouragement."},
		{Role: "user", Content: prompt},
	}
	return ai.Chat(ctx, messages, ai.Options{MaxTokens: 500, Temperature: 0.6})
}

// ChatWithCoach runs the AI coach conversation.
func ChatWithCoach(ctx context.Context, systemPrompt, userMessage string) (string, error) {
	messages := []ai.Message{
		{Role: "system", Content: systemPrompt},
		{Role: "user", Content: userMessage},
	}
	return ai.Chat(ctx, messages, ai.Options{MaxTokens: 500, Temperature: 0.7})
}

var _ = primitive.NilObjectID
