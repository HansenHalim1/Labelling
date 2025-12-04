"use client";

import { useEffect, useState, useCallback } from "react";
import supabase from "../lib/supabaseClient";
import { useSaveAllController } from "./SaveAllContext";

export default function ItemList({ completed = false, deleted = false }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const [movingAll, setMovingAll] = useState(false);
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
          .eq("deleted", deleted);

        if (typeof completed === "boolean" && !deleted) {
          query = query.eq("completed", completed);
        }

        if (searchTerm) {
          query = query.or(
            `abbreviation.ilike.%${searchTerm}%,long_form.ilike.%${searchTerm}%`
          );
        }

        query = query
          .order("updated_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(500);

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
  }, [completed, deleted, search]);

  const handleFieldChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSaveAll = useCallback(async () => {
    if (items.length === 0) return;
    setSavingAll(true);
    const timestamp = new Date().toISOString();
    try {
      await Promise.all(
        items.map(async (item) => {
          const { error } = await supabase
            .from("abbreviations")
            .update({
              abbreviation: item.abbreviation,
              long_form: item.long_form,
              sentence: item.sentence,
              updated_at: timestamp,
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
  }, [items]);

  const handleSave = async (id) => {
    const current = items.find((item) => item.id === id);
    if (!current) return;

    setSavingId(id);
    const timestamp = new Date().toISOString();
    try {
      const { error } = await supabase
        .from("abbreviations")
        .update({
          abbreviation: current.abbreviation,
          long_form: current.long_form,
          sentence: current.sentence,
          updated_at: timestamp,
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
    const nextCompleted = !current.completed;

    const timestamp = new Date().toISOString();
    try {
      const { error } = await supabase
        .from("abbreviations")
        .update({ completed: nextCompleted, updated_at: timestamp })
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

  const handleMoveToDeleted = async (id) => {
    const current = items.find((item) => item.id === id);
    if (!current) return;

    setTogglingId(id);
    const timestamp = new Date().toISOString();
    try {
      const { error } = await supabase
        .from("abbreviations")
        .update({ deleted: true, updated_at: timestamp })
        .eq("id", id);

      if (error) {
        console.error("Error moving to deleted:", error);
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Unexpected delete move error:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleRestore = async (id) => {
    const current = items.find((item) => item.id === id);
    if (!current) return;

    setTogglingId(id);
    const timestamp = new Date().toISOString();
    try {
      const { error } = await supabase
        .from("abbreviations")
        .update({ deleted: false, completed: false, updated_at: timestamp })
        .eq("id", id);

      if (error) {
        console.error("Error restoring item:", error);
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error("Unexpected restore error:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const title = deleted ? "Deleted" : completed ? "Completed" : "Not Completed";
  const subtitle = deleted
    ? "Entries moved out of the active workflow."
    : completed
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

  const handleMoveAllToCompleted = async () => {
    if (items.length === 0) return;
    setMovingAll(true);
    const timestamp = new Date().toISOString();
    try {
      const ids = items.map((item) => item.id);
      const { error } = await supabase
        .from("abbreviations")
        .update({ completed: true, updated_at: timestamp })
        .in("id", ids);

      if (error) {
        console.error("Error moving all to completed:", error);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Unexpected move all error:", err);
    } finally {
      setMovingAll(false);
    }
  };

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
                {deleted
                  ? "Deleted"
                  : item.completed
                  ? "Completed"
                  : "Not completed"}
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
              {deleted ? (
                <button
                  className="btn btn-secondary"
                  disabled={toggling || savingAll}
                  onClick={() => handleRestore(item.id)}
                >
                  {toggling ? "Restoring..." : "Restore to list"}
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-secondary"
                    disabled={toggling || savingAll}
                    onClick={() => handleToggleCompleted(item.id)}
                  >
                    {toggling
                      ? "Updating..."
                      : item.completed
                      ? "Mark as not completed"
                      : "Mark as completed"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    disabled={toggling || savingAll}
                    onClick={() => handleMoveToDeleted(item.id)}
                  >
                    {toggling ? "Moving..." : "Move to deleted"}
                  </button>
                </>
              )}
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

      {!deleted && !completed && items.length > 0 && (
        <div className="bottom-actions">
          <button
            className="btn btn-primary"
            disabled={movingAll}
            onClick={handleMoveAllToCompleted}
          >
            {movingAll ? "Moving all..." : "Move all to completed"}
          </button>
        </div>
      )}
    </div>
  );
}
