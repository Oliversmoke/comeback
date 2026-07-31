package socket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"comeback.ai/server-go/internal/auth"
	"comeback.ai/server-go/internal/config"
	"comeback.ai/server-go/internal/db"
	"comeback.ai/server-go/internal/models"

	"github.com/gorilla/websocket"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		for _, o := range config.App.CORSOrigins {
			if o != "" && o == origin {
				return true
			}
		}
		return origin == ""
	},
}

// Client is a single websocket connection.
type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	userID primitive.ObjectID
}

// Hub maintains room subscriptions and broadcasts messages.
type Hub struct {
	mu      sync.RWMutex
	clients map[primitive.ObjectID]*Client
	rooms   map[string]map[*Client]bool
}

func NewHub() *Hub {
	return &Hub{
		clients: map[primitive.ObjectID]*Client{},
		rooms:   map[string]map[*Client]bool{},
	}
}

func (h *Hub) register(c *Client) {
	h.mu.Lock()
	h.clients[c.userID] = c
	h.mu.Unlock()
	_, _ = db.Collection("users").UpdateOne(nil, bson.M{"_id": c.userID}, bson.M{"$set": bson.M{"isOnline": true, "lastSeen": time.Now()}})
	h.broadcastAll(mustJSON(map[string]interface{}{
		"type":   "presence",
		"userId": c.userID.Hex(),
		"online": true,
	}))
}

func (h *Hub) unregister(c *Client) {
	h.mu.Lock()
	if _, ok := h.clients[c.userID]; ok {
		delete(h.clients, c.userID)
		for room, set := range h.rooms {
			if set[c] {
				delete(set, c)
				if len(set) == 0 {
					delete(h.rooms, room)
				}
			}
		}
	}
	h.mu.Unlock()
	_, _ = db.Collection("users").UpdateOne(nil, bson.M{"_id": c.userID}, bson.M{"$set": bson.M{"isOnline": false, "lastSeen": time.Now()}})
	h.broadcastAll(mustJSON(map[string]interface{}{
		"type":   "presence",
		"userId": c.userID.Hex(),
		"online": false,
	}))
}

func (h *Hub) joinRoom(c *Client, room string) {
	h.mu.Lock()
	if h.rooms[room] == nil {
		h.rooms[room] = map[*Client]bool{}
	}
	h.rooms[room][c] = true
	h.mu.Unlock()
}

func (h *Hub) leaveRoom(c *Client, room string) {
	h.mu.Lock()
	if set, ok := h.rooms[room]; ok {
		delete(set, c)
		if len(set) == 0 {
			delete(h.rooms, room)
		}
	}
	h.mu.Unlock()
}

func (h *Hub) broadcastToRoom(room string, payload []byte, except *Client) {
	h.mu.RLock()
	set := h.rooms[room]
	h.mu.RUnlock()
	for c := range set {
		if c == except {
			continue
		}
		select {
		case c.send <- payload:
		default:
		}
	}
}

// WSEvent is the wire format for client <-> server messages.
type WSEvent struct {
	Type    string                 `json:"type"`
	GroupID string                 `json:"groupId,omitempty"`
	Content string                 `json:"content,omitempty"`
	Payload map[string]interface{} `json:"payload,omitempty"`
}

// ServeWS upgrades the connection and runs the read/write loops for one client.
func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		token = r.Header.Get("Authorization")
		token = trimBearer(token)
	}
	if token == "" {
		http.Error(w, "authentication required", http.StatusUnauthorized)
		return
	}
	claims, err := auth.ParseToken(token)
	if err != nil || claims.Type != "access" {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}
	uid, err := primitive.ObjectIDFromHex(claims.ID)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	c := &Client{hub: hub, conn: conn, send: make(chan []byte, 256), userID: uid}
	hub.register(c)

	// auto-join the user's group rooms
	go func() {
		cur, err := db.Collection("groups").Find(r.Context(), bson.M{"members.user": uid})
		if err == nil {
			var groups []models.Group
			if cur.All(r.Context(), &groups) == nil {
				for _, g := range groups {
					hub.joinRoom(c, "group:"+g.ID.Hex())
				}
			}
		}
	}()

	go c.writePump()
	go c.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister(c)
		_ = c.conn.Close()
	}()
	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		var evt WSEvent
		if err := json.Unmarshal(data, &evt); err != nil {
			continue
		}
		c.handleEvent(evt)
	}
}

func (c *Client) handleEvent(evt WSEvent) {
	switch evt.Type {
	case "group:join":
		if evt.GroupID != "" {
			c.hub.joinRoom(c, "group:"+evt.GroupID)
		}
	case "group:leave":
		if evt.GroupID != "" {
			c.hub.leaveRoom(c, "group:"+evt.GroupID)
		}
	case "message:send":
		c.sendMessage(evt)
	case "message:read":
		c.broadcastRead(evt)
	case "typing:start", "typing:stop":
		c.hub.broadcastToRoom("group:"+evt.GroupID, mustJSON(map[string]interface{}{
			"type":    evt.Type,
			"groupId": evt.GroupID,
			"userId":  c.userID.Hex(),
		}), c)
	case "group:activity":
		c.hub.broadcastToRoom("group:"+evt.GroupID, mustJSON(map[string]interface{}{
			"type":    "group:activity",
			"groupId": evt.GroupID,
			"userId":  c.userID.Hex(),
			"payload": evt.Payload,
		}), c)
	}
}

func (c *Client) sendMessage(evt WSEvent) {
	if evt.GroupID == "" || evt.Content == "" {
		return
	}
	gid, err := primitive.ObjectIDFromHex(evt.GroupID)
	if err != nil {
		return
	}
	// membership check
	var count int64
	count, _ = db.Collection("groups").CountDocuments(c.ctx(), bson.M{"_id": gid, "members.user": c.userID})
	if count == 0 {
		return
	}

	msg := models.Message{
		Group:       gid,
		Sender:      c.userID,
		Content:     evt.Content,
		MessageType: "text",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	res, err := db.Collection("messages").InsertOne(c.ctx(), msg)
	if err != nil {
		return
	}
	msg.ID = res.InsertedID.(primitive.ObjectID)

	var sender models.User
	_ = db.Collection("users").FindOne(c.ctx(), bson.M{"_id": c.userID}).Decode(&sender)

	out := msg.ToOut()
	pu := sender.ToPublicUser()
	out.Sender = &pu

	payload := mustJSON(map[string]interface{}{"type": "message:new", "message": out})
	c.hub.broadcastToRoom("group:"+evt.GroupID, payload, nil)

	_, _ = db.Collection("groups").UpdateOne(c.ctx(), bson.M{"_id": gid}, bson.M{"$set": bson.M{"lastActivityDate": time.Now()}})
}

func (c *Client) broadcastRead(evt WSEvent) {
	ids, _ := evt.Payload["messageIds"].([]interface{})
	objIDs := make([]primitive.ObjectID, 0, len(ids))
	for _, id := range ids {
		if s, ok := id.(string); ok {
			if oid, e := primitive.ObjectIDFromHex(s); e == nil {
				objIDs = append(objIDs, oid)
			}
		}
	}
	if evt.GroupID == "" || len(objIDs) == 0 {
		return
	}
	_, _ = db.Collection("messages").UpdateMany(c.ctx(), bson.M{"_id": bson.M{"$in": objIDs}, "group": mustOID(evt.GroupID)}, bson.M{"$addToSet": bson.M{"readBy": c.userID}})
	c.hub.broadcastToRoom("group:"+evt.GroupID, mustJSON(map[string]interface{}{
		"type":       "message:read",
		"groupId":    evt.GroupID,
		"messageIds": objIDs,
		"userId":     c.userID.Hex(),
	}), c)
}

func (c *Client) writePump() {
	defer func() {
		_ = c.conn.Close()
	}()
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			return
		}
	}
}

func (h *Hub) broadcastAll(payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, c := range h.clients {
		select {
		case c.send <- payload:
		default:
		}
	}
}

func (c *Client) ctx() context.Context {
	return context.Background()
}

func trimBearer(s string) string {
	if len(s) > 7 && s[:7] == "Bearer " {
		return s[7:]
	}
	return s
}

func mustJSON(v interface{}) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		log.Printf("socket json error: %v", err)
		return []byte("{}")
	}
	return b
}

func mustOID(s string) primitive.ObjectID {
	oid, _ := primitive.ObjectIDFromHex(s)
	return oid
}
