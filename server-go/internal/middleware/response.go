package middleware

import (
	"encoding/json"
	"net/http"
)

type APIResponse struct {
	Success    bool        `json:"success"`
	Data       interface{} `json:"data,omitempty"`
	Message    string      `json:"message,omitempty"`
	Pagination interface{} `json:"pagination,omitempty"`
}

func JSON(w http.ResponseWriter, status int, success bool, data interface{}, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	resp := APIResponse{Success: success, Data: data, Message: message}
	_ = json.NewEncoder(w).Encode(resp)
}

func Success(w http.ResponseWriter, data interface{}) {
	JSON(w, http.StatusOK, true, data, "")
}

func SuccessWithStatus(w http.ResponseWriter, status int, data interface{}) {
	JSON(w, status, true, data, "")
}

func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, false, nil, message)
}

func ErrorWithData(w http.ResponseWriter, status int, message string, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(APIResponse{Success: false, Message: message, Data: data})
}
