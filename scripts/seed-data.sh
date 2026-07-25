#!/bin/bash
# MongoDB seed script for comeback.AI
# Usage: bash scripts/seed-data.sh
# Requires mongosh available and MONGODB_URI set

set -e

MONGODB_URI=${MONGODB_URI:-"mongodb://localhost:27017/comebackai"}

echo "Seeding comeback.ai database at $MONGODB_URI ..."

mongosh "$MONGODB_URI" <<'EOF'
const now = new Date();

// Create demo user (password: Demo1234)
const demoUser = db.users.insertOne({
  email: "demo@comeback.ai",
  username: "demo_user",
  displayName: "Demo User",
  password: "$2a$12$LJ3m4ys3Lg3YOCwKkOvCYuG4YqF6YH1wO5n7q0pV1e2r3t4y5u6i7",
  provider: "local",
  xp: 450,
  level: 3,
  streak: 5,
  longestStreak: 12,
  completedTasks: 23,
  isOnline: false,
  createdAt: now,
  updatedAt: now,
});

const userId = demoUser.insertedId;

// Create sample goals
const goals = db.goals.insertMany([
  {
    userId,
    title: "Learn React Native",
    description: "Build a complete mobile app with React Native by end of quarter",
    category: "learning",
    priority: "high",
    progress: 35,
    tags: ["react-native", "mobile", "javascript"],
    milestones: [
      { title: "Setup dev environment", isCompleted: true },
      { title: "Build first screen", isCompleted: true },
      { title: "Add navigation", isCompleted: false },
      { title: "Publish to app store", isCompleted: false },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    userId,
    title: "Run 5K",
    description: "Complete a 5K run in under 30 minutes",
    category: "fitness",
    priority: "medium",
    progress: 60,
    tags: ["fitness", "running", "health"],
    milestones: [
      { title: "Run 1K without stopping", isCompleted: true },
      { title: "Run 3K without stopping", isCompleted: true },
      { title: "Run 5K in 35 min", isCompleted: false },
    ],
    createdAt: now,
    updatedAt: now,
  },
]);

// Create sample tasks
const tasks = db.tasks.insertMany([
  {
    userId,
    title: "Complete React Native tutorial",
    description: "Finish the official React Native getting started guide",
    goalId: goals.insertedIds[0],
    priority: "high",
    status: "completed",
    xpReward: 50,
    dueDate: new Date(now.getTime() + 86400000 * 3),
    createdAt: now,
  },
  {
    userId,
    title: "Morning run - 2K",
    description: "Run 2 kilometers before breakfast",
    goalId: goals.insertedIds[1],
    priority: "medium",
    status: "active",
    xpReward: 30,
    scheduledDate: now,
    createdAt: now,
  },
  {
    userId,
    title: "Read 30 minutes",
    description: "Read a technical book for at least 30 minutes",
    priority: "low",
    status: "active",
    xpReward: 20,
    createdAt: now,
  },
]);

// Link goals to user
db.users.updateOne(
  { _id: userId },
  { $set: { goals: Object.values(goals.insertedIds) } }
);

// Create sample group
const group = db.groups.insertOne({
  name: "React Devs",
  description: "A group for React developers to share progress and tips",
  category: "learning",
  createdBy: userId,
  inviteCode: "REACT2024",
  members: [{ user: userId, role: "admin", joinedAt: now }],
  memberCount: 1,
  isPrivate: false,
  maxMembers: 20,
  tags: ["react", "javascript", "web"],
  createdAt: now,
  updatedAt: now,
});

db.users.updateOne(
  { _id: userId },
  { $push: { groups: group.insertedId } }
);

print("✅ Seed complete!");
print("   Demo user: demo@comeback.ai / Demo1234");
print("   Goals created: " + goals.insertedIds.length);
print("   Tasks created: " + tasks.insertedIds.length);
print("   Group created: " + group.insertedId);
EOF
