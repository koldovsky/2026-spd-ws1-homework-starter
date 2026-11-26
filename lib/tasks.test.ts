import { beforeEach, describe, expect, it } from "vitest";
import { openDb } from "./db";
import { createTask, listTasks, moveTask, RuleViolation } from "./tasks";
import type { DatabaseSync } from "node:sqlite";

let db: DatabaseSync;
beforeEach(() => {
  db = openDb(":memory:");
});

describe("tasks", () => {
  it("creates a task in todo", () => {
    const t = createTask(db, { title: "Write the team agreement", estimateHours: 2 });
    expect(t.status).toBe("todo");
    expect(listTasks(db)).toHaveLength(1);
  });

  it("rejects an empty title", () => {
    expect(() => createTask(db, { title: "  " })).toThrow(RuleViolation);
  });

  it("follows todo → doing → done and keeps done final", () => {
    const t = createTask(db, { title: "Add a hook" });
    moveTask(db, t.id, "doing");
    moveTask(db, t.id, "done");
    expect(() => moveTask(db, t.id, "todo")).toThrow(RuleViolation);
  });

  it("does not skip doing", () => {
    const t = createTask(db, { title: "Path rule" });
    expect(() => moveTask(db, t.id, "done")).toThrow(RuleViolation);
  });
});

describe("estimateHours (TASK-7)", () => {
  const MESSAGE = "estimateHours must be a whole number 1..40";

  it.each([1, 40])("accepts a whole hour value at the boundary: %i", (hours) => {
    const t = createTask(db, { title: "Valid estimate", estimateHours: hours });
    expect(t.estimateHours).toBe(hours);
    expect(listTasks(db)).toHaveLength(1);
  });

  it.each([0, 41, 1.5, "3", "abc"])("rejects %p with the exact message and stores nothing", (hours) => {
    expect(() => createTask(db, { title: "Bad estimate", estimateHours: hours })).toThrow(RuleViolation);
    expect(() => createTask(db, { title: "Bad estimate", estimateHours: hours })).toThrow(MESSAGE);
    expect(listTasks(db)).toHaveLength(0);
  });

  it("creates a task without estimateHours with null", () => {
    const t = createTask(db, { title: "No estimate" });
    expect(t.estimateHours).toBeNull();
    expect(listTasks(db)).toHaveLength(1);
  });

  it("treats an explicit null like an absent field", () => {
    const t = createTask(db, { title: "Explicit null", estimateHours: null });
    expect(t.estimateHours).toBeNull();
    expect(listTasks(db)).toHaveLength(1);
  });
});
