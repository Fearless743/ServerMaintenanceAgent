package learning

import (
	"log"
	"strings"

	"github.com/Fearless743/ServerMaintenanceAgent/internal/database"
)

type Learner struct {
	db *database.Database
}

func New(db *database.Database) *Learner {
	return &Learner{db: db}
}

// Record stores a new learning record
func (l *Learner) Record(rec database.LearningRecord) error {
	if err := l.db.CreateLearningRecord(&rec); err != nil {
		log.Printf("[Learning] Failed to record: %v", err)
		return err
	}
	log.Printf("[Learning] Recorded: problem=%s success=%v confidence=%.2f", rec.Problem, rec.Success, rec.Confidence)
	return nil
}

// FindSolution searches for known solutions matching a problem description
func (l *Learner) FindSolution(metricsOrProblem string) ([]database.LearningRecord, error) {
	// Extract keywords from the metrics/problem text
	keywords := extractKeywords(metricsOrProblem)
	
	var allRecords []database.LearningRecord
	for _, kw := range keywords {
		records, err := l.db.FindSimilarLearning(kw, 5)
		if err != nil {
			continue
		}
		allRecords = append(allRecords, records...)
	}

	// Deduplicate and sort by confidence
	seen := make(map[int64]bool)
	var result []database.LearningRecord
	for _, r := range allRecords {
		if !seen[r.ID] {
			seen[r.ID] = true
			result = append(result, r)
		}
	}

	return result, nil
}

// RecordFeedback updates a learning record with feedback
func (l *Learner) RecordFeedback(id int64, success bool) error {
	rec, err := l.db.GetOperationLog(id)
	if err != nil {
		return err
	}
	_ = rec
	// Find matching learning records and adjust confidence
	records, _ := l.db.ListLearningRecords(100, 0)
	for _, r := range records {
		if r.ServerID == id {
			if success {
				r.Confidence = min(r.Confidence+0.1, 1.0)
			} else {
				r.Confidence = max(r.Confidence-0.15, 0.0)
			}
			l.db.UpdateLearningRecord(&r)
		}
	}
	return nil
}

// UseSolution increments the use count for a solution
func (l *Learner) UseSolution(id int64) error {
	return l.db.IncrementLearningUse(id)
}

func extractKeywords(text string) []string {
	// Simple keyword extraction: split on common delimiters and filter short words
	words := strings.FieldsFunc(text, func(r rune) bool {
		return r == ' ' || r == ',' || r == '\n' || r == '\t' || r == '{' || r == '}' || r == '"' || r == ':'
	})
	
	var keywords []string
	stopWords := map[string]bool{"the": true, "a": true, "an": true, "is": true, "are": true, "was": true, "were": true, "be": true, "been": true, "being": true, "have": true, "has": true, "had": true, "do": true, "does": true, "did": true, "will": true, "would": true, "could": true, "should": true, "may": true, "might": true, "must": true, "shall": true, "can": true, "need": true, "dare": true, "to": true, "of": true, "in": true, "for": true, "on": true, "with": true, "at": true, "by": true, "from": true, "as": true, "into": true, "through": true, "during": true, "before": true, "after": true, "above": true, "below": true, "between": true, "out": true, "off": true, "over": true, "under": true, "again": true, "further": true, "then": true, "once": true, "true": true, "false": true, "null": true, "status": true, "error": true, "result": true, "0": true, "1": true}
	
	for _, w := range words {
		w = strings.ToLower(strings.TrimSpace(w))
		if len(w) > 3 && !stopWords[w] {
			keywords = append(keywords, w)
		}
	}
	return keywords
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
