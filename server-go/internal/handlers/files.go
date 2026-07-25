package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"comeback.ai/server-go/internal/config"

	"github.com/google/uuid"
)

// saveUpload accepts either a multipart file upload (field name) or a JSON
// body with a {"url": "..."} field, returning a publicly-served URL path.
func saveUpload(r *http.Request, field string) (string, error) {
	ct := r.Header.Get("Content-Type")
	if strings.HasPrefix(ct, "multipart/form-data") {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			return "", fmt.Errorf("failed to parse upload")
		}
		file, _, err := r.FormFile(field)
		if err != nil {
			return "", fmt.Errorf("no image file provided")
		}
		defer file.Close()
		if err := os.MkdirAll(config.App.UploadDir, 0o755); err != nil {
			return "", fmt.Errorf("upload dir unavailable")
		}
		ext := ".bin"
		if fn := r.FormValue("filename"); fn != "" {
			ext = filepath.Ext(fn)
		}
		name := uuid.NewString() + ext
		dst := filepath.Join(config.App.UploadDir, name)
		out, err := os.Create(dst)
		if err != nil {
			return "", fmt.Errorf("failed to save file")
		}
		defer out.Close()
		if _, err := io.Copy(out, file); err != nil {
			return "", fmt.Errorf("failed to write file")
		}
		return "/uploads/" + name, nil
	}

	// Fallback: JSON body with an explicit URL (e.g. Cloudinary-less setups).
	var body struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.URL == "" {
		return "", fmt.Errorf("image file or url required")
	}
	return body.URL, nil
}
