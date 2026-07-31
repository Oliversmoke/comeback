package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"comeback.ai/server-go/internal/config"
)

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Options struct {
	Model       string
	MaxTokens   int
	Temperature float64
}

type Provider interface {
	Name() string
	Chat(ctx context.Context, messages []Message, opts Options) (string, error)
}

// ---------------------------------------------------------------------------
// OpenAI (and OpenAI-compatible) provider
// ---------------------------------------------------------------------------

type OpenAIProvider struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

func (p *OpenAIProvider) Name() string { return "openai" }

type openAIChatRequest struct {
	Model       string  `json:"model"`
	Messages    []Message `json:"messages"`
	MaxTokens   int     `json:"max_tokens"`
	Temperature float64 `json:"temperature"`
}

type openAIChatResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func (p *OpenAIProvider) Chat(ctx context.Context, messages []Message, opts Options) (string, error) {
	model := opts.Model
	if model == "" {
		model = p.model
	}
	if model == "" {
		model = "gpt-4o-mini"
	}
	maxTokens := opts.MaxTokens
	if maxTokens == 0 {
		maxTokens = 500
	}
	temp := opts.Temperature
	if temp == 0 {
		temp = 0.7
	}

	body, _ := json.Marshal(openAIChatRequest{
		Model:       model,
		Messages:    messages,
		MaxTokens:   maxTokens,
		Temperature: temp,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("openai provider returned status %d", resp.StatusCode)
	}

	var out openAIChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	if len(out.Choices) == 0 {
		return "", fmt.Errorf("openai provider returned no choices")
	}
	return out.Choices[0].Message.Content, nil
}

// ---------------------------------------------------------------------------
// Fallback (rule-based, works offline) provider — ported from Node backend
// ---------------------------------------------------------------------------

type FallbackProvider struct{ name string }

func (p *FallbackProvider) Name() string { return p.name }

type fbContext struct {
	username       string
	level          int
	xp             int
	streak         int
	completedTasks int
	message        string
	goalCount      int
	taskCount      int
}

var (
	reTaskGen  = regexp.MustCompile(`(?i)-\s*(.+?)\s*\(id:\s*([a-f0-9]+)`)
	reTaskLine = regexp.MustCompile(`(?i)-\s*(.+?)\s*\(`)
	reID       = regexp.MustCompile(`(?i)id:\s*([a-f0-9]+)`)
	reTaskTitle = regexp.MustCompile(`(?i)Task:\s*"(.+?)"`)
)

func (p *FallbackProvider) extractContext(messages []Message) fbContext {
	var allText strings.Builder
	for _, m := range messages {
		allText.WriteString(m.Content)
		allText.WriteString(" ")
	}
	full := allText.String()

	c := fbContext{}
	if m := regexp.MustCompile(`(\w+), Level (\d+), (\d+) XP, (\d+)-day streak, (\d+) tasks completed`).FindStringSubmatch(full); m != nil {
		c.username = m[1]
		c.level, _ = atoiSafe(m[2])
		c.xp, _ = atoiSafe(m[3])
		c.streak, _ = atoiSafe(m[4])
		c.completedTasks, _ = atoiSafe(m[5])
	}
	last := ""
	if len(messages) > 0 {
		last = messages[len(messages)-1].Content
	}
	if mm := regexp.MustCompile(`(?i)User message:\s*(.+)`).FindStringSubmatch(last); mm != nil {
		c.message = strings.TrimSpace(mm[1])
	} else {
		c.message = last
	}
	c.goalCount = strings.Count(full, `"goal"`)
	c.taskCount = strings.Count(full, `"task"`)
	if c.username == "" {
		c.username = "there"
	}
	return c
}

func pick(items ...string) string {
	return items[rand.Intn(len(items))]
}

func pickMap(items []map[string]string) map[string]string {
	return items[rand.Intn(len(items))]
}

func (p *FallbackProvider) Chat(ctx context.Context, messages []Message, opts Options) (string, error) {
	last := ""
	var allText strings.Builder
	for _, m := range messages {
		allText.WriteString(m.Content)
		allText.WriteString(" ")
	}
	if len(messages) > 0 {
		last = messages[len(messages)-1].Content
	}
	full := allText.String()
	ctx2 := p.extractContext(messages)

	// Task generation (structured JSON)
	if strings.Contains(full, "SMART") && strings.Contains(full, "goalId") {
		goals := []map[string]string{}
		for _, m := range reTaskGen.FindAllStringSubmatch(last, -1) {
			goals = append(goals, map[string]string{"title": strings.TrimSpace(m[1]), "id": m[2]})
		}
		if len(goals) == 0 {
			lines := strings.Split(last, "\n")
			for _, line := range lines {
				if !strings.HasPrefix(line, "- ") || strings.Contains(line, "Recent Tasks") {
					continue
				}
				idM := reID.FindStringSubmatch(line)
				titleM := reTaskLine.FindStringSubmatch(line)
				if idM != nil && titleM != nil {
					goals = append(goals, map[string]string{"title": strings.TrimSpace(titleM[1]), "id": idM[1]})
				}
			}
		}
		if len(goals) > 0 {
			var out []map[string]interface{}
			for _, g := range goals {
				out = append(out, map[string]interface{}{
					"title": fmt.Sprintf(`Work on "%s" — 25 min focus session`, g["title"]),
					"description": fmt.Sprintf("Dedicated focus session for your goal: %s", g["title"]),
					"estimatedMinutes": 25, "difficulty": "medium", "category": "productivity", "goalId": g["id"],
				}, map[string]interface{}{
					"title": fmt.Sprintf(`Review progress on "%s"`, g["title"]),
					"description": fmt.Sprintf("Spend 5 minutes reviewing what you accomplished for %s", g["title"]),
					"estimatedMinutes": 5, "difficulty": "easy", "category": "planning", "goalId": g["id"],
				})
			}
			return toJSON(out), nil
		}
		return toJSON([]map[string]interface{}{{
			"title": "Set a goal to unlock AI-generated tasks",
			"description": "Create your first goal in the Goals page",
			"estimatedMinutes": 5, "difficulty": "easy", "category": "planning",
		}}), nil
	}

	// Verification questions
	if strings.Contains(full, "verification coach") || strings.Contains(full, "verification questions") {
		taskTitle := "your task"
		if m := reTaskTitle.FindStringSubmatch(last); m != nil {
			taskTitle = m[1]
		}
		return toJSON([]map[string]string{
			{"question": fmt.Sprintf(`What specific steps did you take to complete "%s"?`, taskTitle)},
			{"question": "What did you learn or achieve by doing this task?"},
			{"question": "How does this task contribute to your overall goal?"},
		}), nil
	}

	// Task proof evaluation
	if strings.Contains(full, "approved") && strings.Contains(full, "feedback") &&
		(strings.Contains(full, "genuinely") || strings.Contains(full, "verifyTaskProof") || strings.Contains(full, "proof of completing")) {
		return toJSON(map[string]interface{}{
			"approved": true,
			"feedback": pick(
				"Great work! Your answers show you genuinely completed this task. Keep up the momentum!",
				"Nice one! You clearly put in the effort here. Way to go!",
				"Awesome, you really nailed this. Your answers show real ownership of the task.",
				"Solid work! It's clear from your answers that you gave this your full attention.",
			),
		}), nil
	}

	// Insights
	if strings.Contains(full, "productivity data") ||
		(strings.Contains(full, "insight") && strings.Contains(full, "suggestion") && strings.Contains(full, "encouragement")) {
		templates := []map[string]string{
			{"insight": "You tend to be most productive in the morning hours. Your completion rate jumps when you tackle tasks before noon.", "suggestion": "Try scheduling your most important task for the first hour of your day.", "encouragement": fmt.Sprintf("You're on a %d-day streak! Consistency beats intensity every time!", ctx2.streak)},
			{"insight": "Your task completion drops on days with more than one high-priority task. You might be overloading yourself.", "suggestion": "Try limiting yourself to one major priority per day and see how that feels.", "encouragement": fmt.Sprintf("Level %d already with %d XP — you're making real progress!", ctx2.level, ctx2.xp)},
			{"insight": "You work best when tasks are connected to a specific goal. Tasks without goal links tend to sit unfinished.", "suggestion": "Link every new task to one of your active goals.", "encouragement": fmt.Sprintf("%d tasks completed so far. Each one is a step in the right direction!", ctx2.completedTasks)},
			{"insight": "Your streak suggests you've built a solid daily habit. That's the hardest part.", "suggestion": "Now try increasing the difficulty slightly — add one more task or increase the time per session.", "encouragement": fmt.Sprintf("%d days and counting. You're building something real here.", ctx2.streak)},
			{"insight": "You tend to underestimate task time. That's okay — it means you're ambitious.", "suggestion": "Try adding 50% more time than you think a task will take. Future you will thank you.", "encouragement": fmt.Sprintf("You've completed %d tasks! That's %d+ XP earned through pure effort.", ctx2.completedTasks, ctx2.completedTasks*10)},
		}
		return toJSON(pickMap(templates)), nil
	}

	msg := strings.ToLower(ctx2.message)

	if regexp.MustCompile(`^(hey|hi|hello|sup|yo|what'?s up|good (morning|afternoon|evening)|howdy)`).MatchString(ctx2.message) {
		return pick(
			fmt.Sprintf("Hey %s! Good to see you. How's your day going? Anything you're looking to tackle?", ctx2.username),
			"Hey there! Ready to make today count? What's on your mind?",
			fmt.Sprintf("Hi %s! I'm here whenever you need me. What are we working on today?", ctx2.username),
			"Hey! Love seeing you here. How are things going?",
		), nil
	}

	if regexp.MustCompile(`how (are|'re|r) you`).MatchString(msg) || regexp.MustCompile(`how'?s (it going|everything)`).MatchString(msg) {
		return pick(
			"I'm doing great, thanks for asking! More importantly — how are you doing? Ready to crush some goals today?",
			"I'm great! Always happy to chat with you. What's been on your mind lately?",
			"Doing well! Though I'm more interested in how YOU are. How's everything going on your end?",
		), nil
	}

	if regexp.MustCompile(`(productivity|productive|motivat|focus)`).MatchString(msg) {
		if ctx2.streak > 0 {
			return pick(
				fmt.Sprintf("You're already on a %d-day streak, which tells me you've got the consistency part down. %sHere's a trick: pick your hardest task and do it first thing. Future you will be grateful.", ctx2.streak, cond(ctx2.completedTasks > 10, fmt.Sprintf("With %d tasks done, you're building serious momentum. ", ctx2.completedTasks), "")),
				fmt.Sprintf("Productivity isn't about doing more — it's about doing what matters. You've got %d active goal%s right now. Which one feels most important today? Start there.", ctx2.goalCount, plural(ctx2.goalCount)),
				fmt.Sprintf("%s, you're already showing up with a %d-day streak. That's huge. Now let's make those days count a little more. What does \"a productive day\" look like to you?", ctx2.username, ctx2.streak),
			), nil
		}
		return pick(
			"Getting productive starts with a single step. What's one thing you could do right now that would make you feel good about today?",
			"The secret to productivity? Start small. Like, embarrassingly small. One task, five minutes. That's it. Give it a shot!",
			"Being productive isn't about grinding all day. It's about doing the right things. What's the most important thing you need to get done?",
		), nil
	}

	if strings.Contains(msg, "goal") {
		if ctx2.goalCount > 0 {
			return pick(
				fmt.Sprintf("You've got %d active goal%s right now. That's solid! How about breaking one of them into smaller steps? The smaller the step, the easier to start.", ctx2.goalCount, plural(ctx2.goalCount)),
				fmt.Sprintf("%d goal%s — nice! Which one feels most exciting to work on today? Sometimes just picking one is the hardest part.", ctx2.goalCount, plural(ctx2.goalCount)),
				fmt.Sprintf("I like that you've got %d goal%s in progress. Just remember: progress > perfection. Even 1%% better today counts.", ctx2.goalCount, plural(ctx2.goalCount)),
			), nil
		}
		return pick(
			"I noticed you don't have any active goals yet. Want to create one? Even a small goal can give you direction.",
			"Setting a goal gives your tasks a why. Want to brainstorm one together? What's something you'd like to achieve?",
		), nil
	}

	if regexp.MustCompile(`streak|consistency|habit`).MatchString(msg) {
		if ctx2.streak >= 5 {
			return pick(
				fmt.Sprintf("%d days! That's serious consistency. %sThe key now is to keep the chain going without burning out. How are you feeling?", ctx2.streak, cond(ctx2.streak >= 10, "Double digits — not everyone gets there. ", "")),
				fmt.Sprintf("A %d-day streak is something to be proud of. What's been working for you to stay consistent?", ctx2.streak),
			), nil
		}
		return pick(
			fmt.Sprintf("Streaks start with day one. You've got %d day%s under your belt! The trick is to make it easy to keep going — even on days when you don't feel like it.", ctx2.streak, plural(ctx2.streak)),
			fmt.Sprintf("Every streak starts somewhere. You're at %d day%s. Tomorrow, you'll be at %d. Just keep showing up.", ctx2.streak, plural(ctx2.streak), ctx2.streak+1),
		), nil
	}

	if regexp.MustCompile(`(overwhelm|stuck|too much|stress|help|don'?t know|not sure|tired|burnout)`).MatchString(msg) {
		return pick(
			"Take a breath. You don't have to do everything today. Pick ONE thing — the smallest thing that feels manageable — and do that. That's a win.",
			"It's easy to get overwhelmed when everything feels urgent. Let's reset: what's the single most important thing you need to do?",
			"You're not alone in feeling this way. The trick is to lower the bar for now. One small task. Five minutes. Go.",
			fmt.Sprintf("%s, it's okay to take a step back. Rest is productive too. Maybe today is a \"review and plan\" day instead of a \"do all the things\" day.", ctx2.username),
		), nil
	}

	if regexp.MustCompile(`(progress|growth|improve|reflect|review|analyze|how (am|'m) I doing)`).MatchString(msg) {
		return pick(
			fmt.Sprintf("Let's look at the numbers: Level %d, %d XP, %d-day streak, %d tasks done. That's real progress, %s. Where do you feel you've grown the most?", ctx2.level, ctx2.xp, ctx2.streak, ctx2.completedTasks, ctx2.username),
			fmt.Sprintf("%d XP earned, %d tasks checked off. Every single one of those was you taking action. What's one thing you've learned about yourself lately?", ctx2.xp, ctx2.completedTasks),
			fmt.Sprintf("Level %d with %d XP — you're moving. The question isn't \"am I making progress?\" (you clearly are). It's \"what's the next level look like for you?\"", ctx2.level, ctx2.xp),
		), nil
	}

	if regexp.MustCompile(`thank(s| you)|thx|appreciate`).MatchString(msg) {
		return pick(
			"You're welcome! I'm here whenever you need me. Keep up the great work!",
			"Anytime! That's what I'm here for. Now go crush your tasks!",
			"My pleasure! Honestly, seeing you put in the work is all the thanks I need.",
		), nil
	}

	defaults := []string{
		fmt.Sprintf("That's a great question. Let me think about it from your perspective. You're at level %d with a %d-day streak and %d tasks completed. What I'd say is: trust the process. You've already proven you can show up. Now it's about showing up for the right things. What feels most important to you right now?", ctx2.level, ctx2.streak, ctx2.completedTasks),
		fmt.Sprintf("I love where your head's at. Here's something that might help: the best predictor of future success is past consistency. And you've got %d day%s of that already. Want to dig deeper into that?", ctx2.streak, plural(ctx2.streak)),
		"Honestly? I think you're overthinking it — and that's okay, we all do it. Take a step back. What's one small thing you could do in the next 5 minutes that would move the needle?",
		fmt.Sprintf("Here's the thing about progress — it's rarely a straight line. You've got %d XP and you're at level %d. That didn't happen by accident. Keep going, but don't forget to enjoy the journey too. What's been the best part so far?", ctx2.xp, ctx2.level),
		fmt.Sprintf("I think the real question is: what do YOU want to get out of today? Not what you \"should\" do, but what would make today feel like a win for you? Start there."),
		fmt.Sprintf("%s, you're doing better than you think. %sNow let's channel that into something meaningful. What matters most to you right now?", ctx2.username, cond(ctx2.streak > 0, fmt.Sprintf("A %d-day streak doesn't lie — you've got the discipline. ", ctx2.streak), "")),
		"Great question! Let me flip it around: what would \"a great day\" look like for you? Not a perfect day, just a good one. Let's work backward from there.",
	}
	return pick(defaults...), nil
}

func cond(ok bool, a, b string) string {
	if ok {
		return a
	}
	return b
}

func plural(n int) string {
	if n == 1 {
		return ""
	}
	return "s"
}

func toJSON(v interface{}) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func atoiSafe(s string) (int, bool) {
	var n int
	_, err := fmt.Sscanf(s, "%d", &n)
	return n, err == nil
}

// ---------------------------------------------------------------------------
// Provider selection
// ---------------------------------------------------------------------------

var active Provider

func Initialize() Provider {
	preferred := config.App.AIProvider
	apiKey := ""
	switch preferred {
	case "openai":
		apiKey = config.App.OpenAIAPIKey
	case "anthropic":
		apiKey = config.App.AnthropicKey
	case "gemini":
		apiKey = config.App.GeminiAPIKey
	}

	base := config.App.OpenAIBaseURL
	if base == "" {
		base = "https://api.openai.com/v1"
	}

	if apiKey != "" {
		p := &OpenAIProvider{apiKey: apiKey, baseURL: base, model: "gpt-4o-mini", client: &http.Client{Timeout: 30 * time.Second}}
		active = p
		fmt.Printf("AI provider initialized: %s\n", preferred)
		_ = os.Stdout
		return p
	}

	fb := &FallbackProvider{name: "fallback"}
	active = fb
	fmt.Println("AI provider initialized: fallback (no API key configured)")
	return fb
}

func Chat(ctx context.Context, messages []Message, opts Options) (string, error) {
	if active == nil {
		active = Initialize()
	}
	out, err := active.Chat(ctx, messages, opts)
	if err != nil {
		// Graceful fallback to the offline rule-based coach.
		fallback := &FallbackProvider{name: "fallback"}
		if fout, ferr := fallback.Chat(ctx, messages, opts); ferr == nil {
			return fout, nil
		}
		return out, err
	}
	return out, nil
}
