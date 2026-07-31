package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User ----------------------------------------------------------------------
type User struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Email             string             `bson:"email" json:"email"`
	Username          string             `bson:"username" json:"username"`
	Password          string             `bson:"password,omitempty" json:"-"`
	DisplayName       string             `bson:"displayName,omitempty" json:"displayName,omitempty"`
	Avatar            string             `bson:"avatar,omitempty" json:"avatar,omitempty"`
	Bio               string             `bson:"bio,omitempty" json:"bio,omitempty"`
	Provider          string             `bson:"provider" json:"provider"`
	ProviderID        string             `bson:"providerId,omitempty" json:"providerId,omitempty"`
	Goals             []primitive.ObjectID `bson:"goals,omitempty" json:"goals,omitempty"`
	Groups            []primitive.ObjectID `bson:"groups,omitempty" json:"groups,omitempty"`
	Xp                int                `bson:"xp" json:"xp"`
	Level             int                `bson:"level" json:"level"`
	Streak            int                `bson:"streak" json:"streak"`
	LongestStreak     int                `bson:"longestStreak" json:"longestStreak"`
	LastActiveDate    time.Time          `bson:"lastActiveDate,omitempty" json:"lastActiveDate,omitempty"`
	CompletedTasks    int                `bson:"completedTasks" json:"completedTasks"`
	IsOnline          bool               `bson:"isOnline" json:"isOnline"`
	LastSeen          time.Time          `bson:"lastSeen,omitempty" json:"lastSeen,omitempty"`
	RefreshToken      string             `bson:"refreshToken,omitempty" json:"-"`
	ResetPasswordToken string            `bson:"resetPasswordToken,omitempty" json:"-"`
	ResetPasswordExpires time.Time       `bson:"resetPasswordExpires,omitempty" json:"-"`
	CreatedAt         time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt         time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

type PublicUser struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Username    string             `json:"username"`
	DisplayName string             `json:"displayName,omitempty"`
	Avatar      string             `json:"avatar,omitempty"`
	Xp          int                `json:"xp"`
	Level       int                `json:"level"`
	Streak      int                `json:"streak"`
	IsOnline    bool               `json:"isOnline"`
}

func (u User) ToPublic() map[string]interface{} {
	return map[string]interface{}{
		"id":            u.ID.Hex(),
		"email":         u.Email,
		"username":      u.Username,
		"displayName":   u.DisplayName,
		"avatar":        u.Avatar,
		"bio":           u.Bio,
		"xp":            u.Xp,
		"level":         u.Level,
		"streak":        u.Streak,
		"longestStreak": u.LongestStreak,
		"completedTasks": u.CompletedTasks,
		"goals":         u.Goals,
		"groups":        u.Groups,
		"isOnline":      u.IsOnline,
		"lastSeen":      u.LastSeen,
		"createdAt":     u.CreatedAt,
	}
}

func (u User) ToPublicUser() PublicUser {
	return PublicUser{
		ID:          u.ID,
		Username:    u.Username,
		DisplayName: u.DisplayName,
		Avatar:      u.Avatar,
		Xp:          u.Xp,
		Level:       u.Level,
		Streak:      u.Streak,
		IsOnline:    u.IsOnline,
	}
}

// Goal ----------------------------------------------------------------------
type Milestone struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Title       string             `bson:"title" json:"title"`
	IsCompleted bool               `bson:"isCompleted" json:"isCompleted"`
	CompletedAt time.Time          `bson:"completedAt,omitempty" json:"completedAt,omitempty"`
}

type AiInsights struct {
	Difficulty    string   `bson:"difficulty,omitempty" json:"difficulty,omitempty"`
	EstimatedWeeks int     `bson:"estimatedWeeks,omitempty" json:"estimatedWeeks,omitempty"`
	Breakdown     []string `bson:"breakdown,omitempty" json:"breakdown,omitempty"`
	Suggestions   []string `bson:"suggestions,omitempty" json:"suggestions,omitempty"`
}

type Goal struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	User            primitive.ObjectID `bson:"user" json:"user"`
	Title           string             `bson:"title" json:"title"`
	Description     string             `bson:"description,omitempty" json:"description,omitempty"`
	Category        string             `bson:"category" json:"category"`
	Priority        string             `bson:"priority" json:"priority"`
	Status          string             `bson:"status" json:"status"`
	StartDate       time.Time          `bson:"startDate,omitempty" json:"startDate,omitempty"`
	TargetDate      time.Time          `bson:"targetDate,omitempty" json:"targetDate,omitempty"`
	CompletedDate   time.Time          `bson:"completedDate,omitempty" json:"completedDate,omitempty"`
	Progress        int                `bson:"progress" json:"progress"`
	Milestones      []Milestone        `bson:"milestones,omitempty" json:"milestones,omitempty"`
	Tags            []string           `bson:"tags,omitempty" json:"tags,omitempty"`
	IsAiGenerated   bool               `bson:"isAiGenerated" json:"isAiGenerated"`
	AiInsights      AiInsights         `bson:"aiInsights,omitempty" json:"aiInsights,omitempty"`
	SharedWithGroups []primitive.ObjectID `bson:"sharedWithGroups,omitempty" json:"sharedWithGroups,omitempty"`
	XpAwarded       int                `bson:"xpAwarded" json:"xpAwarded"`
	CreatedAt       time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt       time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

// Task ----------------------------------------------------------------------
type AiContext struct {
	Reasoning     string `bson:"reasoning,omitempty" json:"reasoning,omitempty"`
	Difficulty    string `bson:"difficulty,omitempty" json:"difficulty,omitempty"`
	Category      string `bson:"category,omitempty" json:"category,omitempty"`
	TimeEstimate  int    `bson:"timeEstimate,omitempty" json:"timeEstimate,omitempty"`
}

type Proof struct {
	Text        string    `bson:"text,omitempty" json:"text,omitempty"`
	Image       string    `bson:"image,omitempty" json:"image,omitempty"`
	SubmittedAt time.Time `bson:"submittedAt,omitempty" json:"submittedAt,omitempty"`
}

type AiReviewQuestion struct {
	Question string `bson:"question" json:"question"`
}

type AiReviewAnswer struct {
	Question string `bson:"question" json:"question"`
	Answer   string `bson:"answer" json:"answer"`
}

type AiReview struct {
	Questions  []AiReviewQuestion `bson:"questions,omitempty" json:"questions,omitempty"`
	Answers    []AiReviewAnswer   `bson:"answers,omitempty" json:"answers,omitempty"`
	Status     string             `bson:"status" json:"status"`
	ReviewedAt time.Time          `bson:"reviewedAt,omitempty" json:"reviewedAt,omitempty"`
}

type Task struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	User          primitive.ObjectID `bson:"user" json:"user"`
	Goal          primitive.ObjectID `bson:"goal,omitempty" json:"goal,omitempty"`
	Group         primitive.ObjectID `bson:"group,omitempty" json:"group,omitempty"`
	Title         string             `bson:"title" json:"title"`
	Description   string             `bson:"description,omitempty" json:"description,omitempty"`
	Priority      string             `bson:"priority" json:"priority"`
	Status        string             `bson:"status" json:"status"`
	DueDate       time.Time          `bson:"dueDate,omitempty" json:"dueDate,omitempty"`
	ScheduledDate time.Time          `bson:"scheduledDate,omitempty" json:"scheduledDate,omitempty"`
	CompletedAt   time.Time          `bson:"completedAt,omitempty" json:"completedAt,omitempty"`
	XpReward      int                `bson:"xpReward" json:"xpReward"`
	IsAiGenerated bool               `bson:"isAiGenerated" json:"isAiGenerated"`
	AiContext     AiContext          `bson:"aiContext,omitempty" json:"aiContext,omitempty"`
	Proof         Proof              `bson:"proof,omitempty" json:"proof,omitempty"`
	AiReview      AiReview           `bson:"aiReview,omitempty" json:"aiReview,omitempty"`
	IsDailyTask   bool               `bson:"isDailyTask" json:"isDailyTask"`
	DateFor       time.Time          `bson:"dateFor,omitempty" json:"dateFor,omitempty"`
	Dependencies  []primitive.ObjectID `bson:"dependencies,omitempty" json:"dependencies,omitempty"`
	CompletedBy   []primitive.ObjectID `bson:"completedBy,omitempty" json:"completedBy,omitempty"`
	IsGroupTask   bool               `bson:"isGroupTask" json:"isGroupTask"`
	CreatedAt     time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt     time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

type GoalMin struct {
	ID       primitive.ObjectID `json:"_id,omitempty"`
	Title    string             `json:"title"`
	Category string             `json:"category,omitempty"`
}

type GroupMin struct {
	ID    primitive.ObjectID `json:"_id,omitempty"`
	Name  string             `json:"name"`
}

type TaskOut struct {
	ID            primitive.ObjectID `json:"_id,omitempty"`
	User          primitive.ObjectID `json:"user,omitempty"`
	Goal          *GoalMin           `json:"goal,omitempty"`
	Group         *GroupMin          `json:"group,omitempty"`
	Title         string             `json:"title"`
	Description   string             `json:"description,omitempty"`
	Priority      string             `json:"priority"`
	Status        string             `json:"status"`
	DueDate       time.Time          `json:"dueDate,omitempty"`
	ScheduledDate time.Time          `json:"scheduledDate,omitempty"`
	CompletedAt   time.Time          `json:"completedAt,omitempty"`
	XpReward      int                `json:"xpReward"`
	IsAiGenerated bool               `json:"isAiGenerated"`
	AiContext     AiContext          `json:"aiContext,omitempty"`
	Proof         Proof              `json:"proof,omitempty"`
	AiReview      AiReview           `json:"aiReview,omitempty"`
	IsDailyTask   bool               `json:"isDailyTask"`
	DateFor       time.Time          `json:"dateFor,omitempty"`
	IsGroupTask   bool               `json:"isGroupTask"`
	CreatedAt     time.Time          `json:"createdAt,omitempty"`
	UpdatedAt     time.Time          `json:"updatedAt,omitempty"`
}

func (t Task) ToOut() TaskOut {
	return TaskOut{
		ID: t.ID, User: t.User, Title: t.Title, Description: t.Description,
		Priority: t.Priority, Status: t.Status, DueDate: t.DueDate, ScheduledDate: t.ScheduledDate,
		CompletedAt: t.CompletedAt, XpReward: t.XpReward, IsAiGenerated: t.IsAiGenerated,
		AiContext: t.AiContext, Proof: t.Proof, AiReview: t.AiReview, IsDailyTask: t.IsDailyTask,
		DateFor: t.DateFor, IsGroupTask: t.IsGroupTask, CreatedAt: t.CreatedAt, UpdatedAt: t.UpdatedAt,
	}
}

// Group ---------------------------------------------------------------------
type GroupMember struct {
	User       primitive.ObjectID `bson:"user" json:"user"`
	Role       string             `bson:"role" json:"role"`
	JoinedAt   time.Time          `bson:"joinedAt,omitempty" json:"joinedAt,omitempty"`
	XpInGroup  int                `bson:"xpInGroup" json:"xpInGroup"`
}

type GroupMemberOut struct {
	User      *PublicUser `json:"user,omitempty"`
	Role      string      `json:"role"`
	JoinedAt  time.Time   `json:"joinedAt,omitempty"`
	XpInGroup int         `json:"xpInGroup"`
}

type Group struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Name           string             `bson:"name" json:"name"`
	Description    string             `bson:"description,omitempty" json:"description,omitempty"`
	CoverImage     string             `bson:"coverImage,omitempty" json:"coverImage,omitempty"`
	Category       string             `bson:"category" json:"category"`
	CreatedBy      primitive.ObjectID `bson:"createdBy" json:"createdBy"`
	Members        []GroupMember      `bson:"members,omitempty" json:"members,omitempty"`
	Goals          []primitive.ObjectID `bson:"goals,omitempty" json:"goals,omitempty"`
	IsPrivate      bool               `bson:"isPrivate" json:"isPrivate"`
	InviteCode     string             `bson:"inviteCode,omitempty" json:"inviteCode,omitempty"`
	MaxMembers     int                `bson:"maxMembers" json:"maxMembers"`
	TotalXp        int                `bson:"totalXp" json:"totalXp"`
	Streak         int                `bson:"streak" json:"streak"`
	LastActivityDate time.Time        `bson:"lastActivityDate,omitempty" json:"lastActivityDate,omitempty"`
	Rules          []string           `bson:"rules,omitempty" json:"rules,omitempty"`
	Tags           []string           `bson:"tags,omitempty" json:"tags,omitempty"`
	CreatedAt      time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt      time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

// Message -------------------------------------------------------------------
type Attachment struct {
	URL  string `bson:"url,omitempty" json:"url,omitempty"`
	Type string `bson:"type,omitempty" json:"type,omitempty"`
	Name string `bson:"name,omitempty" json:"name,omitempty"`
}

type Message struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Group       primitive.ObjectID `bson:"group" json:"group"`
	Sender      primitive.ObjectID `bson:"sender" json:"sender"`
	Content     string             `bson:"content" json:"content"`
	MessageType string             `bson:"messageType" json:"messageType"`
	Attachments []Attachment       `bson:"attachments,omitempty" json:"attachments,omitempty"`
	Mentions    []primitive.ObjectID `bson:"mentions,omitempty" json:"mentions,omitempty"`
	ReadBy      []primitive.ObjectID `bson:"readBy,omitempty" json:"readBy,omitempty"`
	EditedAt    time.Time          `bson:"editedAt,omitempty" json:"editedAt,omitempty"`
	IsDeleted   bool               `bson:"isDeleted" json:"isDeleted"`
	CreatedAt   time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt   time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

type MessageOut struct {
	ID          primitive.ObjectID `json:"_id,omitempty"`
	Group       primitive.ObjectID `json:"group"`
	Sender      *PublicUser        `json:"sender,omitempty"`
	Content     string             `json:"content"`
	MessageType string             `json:"messageType"`
	Attachments []Attachment       `json:"attachments,omitempty"`
	Mentions    []primitive.ObjectID `json:"mentions,omitempty"`
	ReadBy      []primitive.ObjectID `json:"readBy,omitempty"`
	EditedAt    time.Time          `json:"editedAt,omitempty"`
	IsDeleted   bool               `json:"isDeleted"`
	CreatedAt   time.Time          `json:"createdAt,omitempty"`
	UpdatedAt   time.Time          `json:"updatedAt,omitempty"`
}

func (m Message) ToOut() MessageOut {
	return MessageOut{
		ID: m.ID, Group: m.Group, Content: m.Content, MessageType: m.MessageType,
		Attachments: m.Attachments, Mentions: m.Mentions, ReadBy: m.ReadBy,
		EditedAt: m.EditedAt, IsDeleted: m.IsDeleted, CreatedAt: m.CreatedAt, UpdatedAt: m.UpdatedAt,
	}
}

// Conversation --------------------------------------------------------------
type LastMessage struct {
	Content   string             `bson:"content,omitempty" json:"content,omitempty"`
	Sender    primitive.ObjectID `bson:"sender,omitempty" json:"sender,omitempty"`
	CreatedAt time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
}

type Conversation struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Participants   []primitive.ObjectID `bson:"participants" json:"participants"`
	LastMessage    LastMessage        `bson:"lastMessage,omitempty" json:"lastMessage,omitempty"`
	LastActivityAt time.Time          `bson:"lastActivityAt,omitempty" json:"lastActivityAt,omitempty"`
	CreatedAt      time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt      time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

// Achievement ---------------------------------------------------------------
type AchievementProgress struct {
	Current int `bson:"current" json:"current"`
	Target  int `bson:"target" json:"target"`
}

type Achievement struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	User        primitive.ObjectID `bson:"user" json:"user"`
	AchievementID string           `bson:"id" json:"id"`
	Title       string             `bson:"title" json:"title"`
	Description string             `bson:"description" json:"description"`
	Icon        string             `bson:"icon" json:"icon"`
	Category    string             `bson:"category" json:"category"`
	Tier        string             `bson:"tier" json:"tier"`
	XpReward    int                `bson:"xpReward" json:"xpReward"`
	Progress    AchievementProgress `bson:"progress" json:"progress"`
	UnlockedAt  time.Time          `bson:"unlockedAt,omitempty" json:"unlockedAt,omitempty"`
	IsNotified  bool               `bson:"isNotified" json:"isNotified"`
	CreatedAt   time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt   time.Time          `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

// UserMemory ----------------------------------------------------------------
type UserMemory struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	User             primitive.ObjectID `bson:"user" json:"user"`
	ChallengePreference string          `bson:"challengePreference,omitempty" json:"challengePreference,omitempty"`
	InteractionCount int               `bson:"interactionCount" json:"interactionCount"`
	LastInteractionSummary string       `bson:"lastInteractionSummary,omitempty" json:"lastInteractionSummary,omitempty"`
	CreatedAt        time.Time         `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt        time.Time         `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

// UserActivity --------------------------------------------------------------
type UserActivityMetadata struct {
	TaskID      primitive.ObjectID `bson:"taskId,omitempty" json:"taskId,omitempty"`
	GoalID      primitive.ObjectID `bson:"goalId,omitempty" json:"goalId,omitempty"`
	GroupID     primitive.ObjectID `bson:"groupId,omitempty" json:"groupId,omitempty"`
	Category    string             `bson:"category,omitempty" json:"category,omitempty"`
	Value       int                `bson:"value,omitempty" json:"value,omitempty"`
	Description string             `bson:"description,omitempty" json:"description,omitempty"`
}

type UserActivity struct {
	ID          primitive.ObjectID   `bson:"_id,omitempty" json:"_id,omitempty"`
	User        primitive.ObjectID   `bson:"user" json:"user"`
	Date        time.Time            `bson:"date" json:"date"`
	ActivityType string              `bson:"activityType" json:"activityType"`
	Metadata    UserActivityMetadata `bson:"metadata,omitempty" json:"metadata,omitempty"`
	CreatedAt   time.Time            `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
}

// XpTransaction -------------------------------------------------------------
type XpTransaction struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	User      primitive.ObjectID `bson:"user" json:"user"`
	Amount    int                `bson:"amount" json:"amount"`
	Type      string             `bson:"type" json:"type"`
	CreatedAt time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
}

// AppBranding ---------------------------------------------------------------
type AppBranding struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	Key       string             `bson:"key" json:"key"`
	LogoURL    string            `bson:"logo_url,omitempty" json:"logoUrl,omitempty"`
	BackgroundURL string         `bson:"background_url,omitempty" json:"backgroundUrl,omitempty"`
	UpdatedBy  primitive.ObjectID `bson:"updatedBy,omitempty" json:"updatedBy,omitempty"`
	CreatedAt  time.Time         `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
	UpdatedAt  time.Time         `bson:"updatedAt,omitempty" json:"updatedAt,omitempty"`
}

// UserInsight ---------------------------------------------------------------
type UserInsight struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id,omitempty"`
	User      primitive.ObjectID `bson:"user" json:"user"`
	Type      string             `bson:"type" json:"type"`
	Title     string             `bson:"title" json:"title"`
	Content   string             `bson:"content" json:"content"`
	IsRead    bool               `bson:"isRead" json:"isRead"`
	CreatedAt time.Time          `bson:"createdAt,omitempty" json:"createdAt,omitempty"`
}
