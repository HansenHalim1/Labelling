"use client";

import { useEffect, useState } from "react";
import supabase from "../lib/supabaseClient";
import { useSaveAllController } from "./SaveAllContext";

export default function ItemList({ completed = false }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { register } = useSaveAllController();

  useEffect(() => {
    let isMounted = true;

    const fetchItems = async () => {
      setLoading(true);
      setErrorMessage("");
      const searchTerm = search.trim();
      try {
        let query = supabase
          .from("abbreviations")
          .select("*")
          .eq("completed", completed);

        if (searchTerm) {
          query = query.or(
            `abbreviation.ilike.%${searchTerm}%,long_form.ilike.%${searchTerm}%`
          );
        }

        query = query.order("created_at", { ascending: true }).limit(500);

        const { data, error } = await query;
        if (error) {
          const message = error.message || "Failed to fetch items";
          console.error("Error fetching items:", error);
          if (isMounted) {
            setErrorMessage(message);
          }
          return;
        }

        if (isMounted) {
          setItems(data || []);
        }
      } catch (err) {
        console.error("Unexpected fetch error:", err);
        if (isMounted) {
          setErrorMessage(err.message || "Failed to fetch items");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchItems();

    return () => {
      isMounted = false;
    };
  }, [completed, search]);

  const handleFieldChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSaveAll = async () => {
    if (items.length === 0) return;
    setSavingAll(true);
    try {
      await Promise.all(
        items.map(async (item) => {
          const { error } = await supabase
            .from("abbreviations")
            .update({
              abbreviation: item.abbreviation,
              long_form: item.long_form,
              sentence: item.sentence,
            })
            .eq("id", item.id);

          if (error) {
            console.error(`Error saving item ${item.id}:`, error);
          }
        })
      );
    } catch (err) {
      console.error("Unexpected bulk save error:", err);
    } finally {
      setSavingAll(false);
    }
  };

  const handleSave = async (id) => {
    const current = items.find((item) => item.id === id);
    if (!current) return;

    setSavingId(id);
    try {
      const { error } = await supabase
        .from("abbreviations")
        .update({
          abbreviation: current.abbreviation,
          long_form: current.long_form,
          sentence: current.sentence,
        })
        .eq("id", id);

      if (error) {
        console.error("Error updating item:", error);
      }
    } catch (err) {
      console.error("Unexpected update error:", err);
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleCompleted = async (id) => {
    const current = items.find((item) => item.id === id);
    if (!current) return;

    setTogglingId(id);
    const nextCompleted = !completed;

    try {
      const { error } = await supabase
        .from("abbreviations")
        .update({ completed: nextCompleted })
        .eq("id", id);

      if (error) {
        console.error("Error toggling completion:", error);
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Unexpected toggle error:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const title = completed ? "Completed" : "Not Completed";
  const subtitle = completed
    ? "Reviewed entries marked as completed."
    : "Entries that still need review.";
  const countLabel = `${items.length} ${items.length === 1 ? "item" : "items"}`;

  useEffect(() => {
    register({
      onClick: items.length ? handleSaveAll : null,
      disabled: savingAll || loading || items.length === 0,
      label: savingAll ? "Saving all..." : "Save all",
    });

    return () =>
      register({
        onClick: null,
        disabled: true,
        label: "Save all",
      });
  }, [register, handleSaveAll, savingAll, loading, items.length]);

  return (
    <div className="list-wrapper">
      <div className="list-header">
        <div>
          <div className="title-row">
            <h1 className="page-title">{title}</h1>
            <span className="count-badge">{countLabel}</span>
          </div>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <div className="list-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search abbreviation or long form..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && <p className="muted">Loading...</p>}
      {!loading && errorMessage && (
        <p className="error-text">Error: {errorMessage}</p>
      )}
      {!loading && items.length === 0 && (
        <p className="muted">No items to display.</p>
      )}

      {items.map((item) => {
        const saving = savingId === item.id;
        const toggling = togglingId === item.id;

        return (
          <div className="card" key={item.id}>
            <div className="card-header">
              <div className="card-title">{item.abbreviation || "Untitled"}</div>
              <span className="badge">
                {completed ? "Completed" : "Not completed"}
              </span>
            </div>

            <label className="field-label" htmlFor={`abbr-${item.id}`}>
              Abbreviation
            </label>
            <input
              id={`abbr-${item.id}`}
              className="field-input"
              type="text"
              value={item.abbreviation || ""}
              onChange={(e) =>
                handleFieldChange(item.id, "abbreviation", e.target.value)
              }
            />

            <label className="field-label" htmlFor={`long-${item.id}`}>
              Long form
            </label>
            <input
              id={`long-${item.id}`}
              className="field-input"
              type="text"
              value={item.long_form || ""}
              onChange={(e) =>
                handleFieldChange(item.id, "long_form", e.target.value)
              }
            />

            <label className="field-label" htmlFor={`sentence-${item.id}`}>
              Sentence
            </label>
            <textarea
              id={`sentence-${item.id}`}
              className="field-textarea"
              rows={3}
              value={item.sentence || ""}
              onChange={(e) =>
                handleFieldChange(item.id, "sentence", e.target.value)
              }
            />

            <div className="card-actions">
              <button
                className="btn btn-secondary"
                disabled={toggling || savingAll}
                onClick={() => handleToggleCompleted(item.id)}
              >
                {toggling
                  ? "Updating..."
                  : completed
                  ? "Mark as not completed"
                  : "Mark as completed"}
              </button>
              <button
                className="btn btn-primary"
                disabled={saving || savingAll}
                onClick={() => handleSave(item.id)}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
