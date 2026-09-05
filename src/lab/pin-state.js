/*
 * pin-state.js — validated procedure state, with no renderer or browser dependency.
 * Coordinates are authored specimen-local model units, not millimetres or forces.
 * The four distal regions are educational placement constraints, not a tissue
 * mechanics simulation. A renderer consumes anchors; it never decides completion.
 */

export function createPinState(config, saved) {
  const finitePoint = (p) =>
    Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
  const tray = config && config.tray && { ...config.tray };
  const source = config && config.targets;
  if (
    !tray ||
    !["y", "minX", "maxX", "minZ", "maxZ"].every((key) =>
      Number.isFinite(tray[key]),
    ) ||
    tray.minX >= tray.maxX ||
    tray.minZ >= tray.maxZ ||
    !Array.isArray(source) ||
    source.length !== 4
  ) {
    throw new Error(
      "Pinning needs a finite tray and exactly four authored distal targets.",
    );
  }
  const targets = source.map((target) => ({
    id: target.id,
    partId: target.partId,
    label: target.label,
    center: target.center && target.center.slice(),
    radius: target.radius,
  }));
  const ids = new Set();
  targets.forEach((target) => {
    if (
      typeof target.id !== "string" ||
      !target.id ||
      ids.has(target.id) ||
      typeof target.partId !== "string" ||
      !target.partId ||
      typeof target.label !== "string" ||
      !target.label ||
      !finitePoint(target.center) ||
      !Number.isFinite(target.radius) ||
      target.radius <= 0 ||
      Math.abs(target.center[1] - tray.y) > 0.000001 ||
      target.center[0] - target.radius < tray.minX ||
      target.center[0] + target.radius > tray.maxX ||
      target.center[2] - target.radius < tray.minZ ||
      target.center[2] + target.radius > tray.maxZ
    ) {
      throw new Error("Invalid or duplicate distal pin target.");
    }
    ids.add(target.id);
  });
  if (new Set(targets.map((target) => target.partId)).size !== 4) {
    throw new Error("Each pin target must belong to a different limb.");
  }
  targets.forEach((target, index) => {
    if (
      targets
        .slice(index + 1)
        .some(
          (other) =>
            Math.hypot(
              target.center[0] - other.center[0],
              target.center[2] - other.center[2],
            ) <=
            target.radius + other.radius,
        )
    ) {
      throw new Error("Distal pin target regions must not overlap.");
    }
  });
  const byId = new Map(targets.map((target) => [target.id, target]));
  const specimenId = config.specimenId || "frog";
  const configKey = JSON.stringify({ specimenId, tray, targets });
  let anchors = new Map();
  let confirmed = false;
  let history = [];
  let restoreError = null;

  function validate(id, position) {
    const target = byId.get(id);
    if (!target)
      return {
        ok: false,
        code: "target",
        reason:
          "Choose one of the four distal limb regions, not the torso, eyes or a joint.",
      };
    if (!finitePoint(position))
      return {
        ok: false,
        code: "coordinates",
        reason: "The pin position could not be read. Choose the limb again.",
      };
    const [x, y, z] = position;
    if (
      Math.abs(y - tray.y) > 0.001 ||
      x < tray.minX ||
      x > tray.maxX ||
      z < tray.minZ ||
      z > tray.maxZ
    ) {
      return {
        ok: false,
        code: "tray",
        reason: "Place the pin on the tray surface, inside its raised edges.",
      };
    }
    if (
      Math.hypot(x - target.center[0], z - target.center[2]) >
      target.radius + 1e-9
    ) {
      return {
        ok: false,
        code: "region",
        reason:
          "Move to the highlighted distal hand or foot region. Keep pins away from joints and the torso.",
      };
    }
    return { ok: true, position: [x, tray.y, z], targetId: id };
  }

  const cloneAnchors = (map = anchors) =>
    Object.fromEntries([...map].map(([id, p]) => [id, p.slice()]));
  const entry = () => ({ anchors: cloneAnchors(), confirmed });
  const cloneEntry = (item) => ({
    anchors: Object.fromEntries(
      Object.entries(item.anchors).map(([id, p]) => [id, p.slice()]),
    ),
    confirmed: item.confirmed,
  });
  function decode(item) {
    if (
      !item ||
      typeof item !== "object" ||
      !item.anchors ||
      Array.isArray(item.anchors) ||
      typeof item.anchors !== "object" ||
      typeof item.confirmed !== "boolean"
    )
      return null;
    const decoded = new Map();
    for (const [id, p] of Object.entries(item.anchors)) {
      const check = validate(id, p);
      if (!check.ok) return null;
      decoded.set(id, check.position);
    }
    if (decoded.size > 4 || (item.confirmed && decoded.size !== 4)) return null;
    return { anchors: decoded, confirmed: item.confirmed };
  }
  if (saved != null) {
    try {
      const payload = typeof saved === "string" ? JSON.parse(saved) : saved;
      const decoded =
        payload &&
        payload.version === 1 &&
        payload.specimenId === specimenId &&
        payload.configKey === configKey &&
        decode(payload);
      if (!decoded)
        throw new Error("Saved anchors no longer match the current specimen.");
      // Every history frame is validated too; undo must never resurrect bad data.
      const previous = payload.history == null ? [] : payload.history;
      if (
        !Array.isArray(previous) ||
        previous.length > 32 ||
        previous.some((item) => !decode(item))
      ) {
        throw new Error("The saved pin history is invalid.");
      }
      anchors = decoded.anchors;
      confirmed = decoded.confirmed;
      history = previous.map(cloneEntry);
    } catch (error) {
      restoreError =
        "Saved pin positions were invalid or belonged to an older model. Start with four new pins.";
    }
  }

  function snapshot() {
    const ready =
      anchors.size === 4 &&
      targets.every((target) => {
        const point = anchors.get(target.id);
        return point && validate(target.id, point).ok;
      });
    return {
      enabled: true,
      anchors: cloneAnchors(),
      pinned: [...anchors.keys()],
      count: anchors.size,
      total: 4,
      canContinue: ready && !confirmed,
      confirmed: ready && confirmed,
      continued: ready && confirmed,
      history: history.map(cloneEntry),
      restoreError,
      targets: targets.map((target) => ({
        ...target,
        center: target.center.slice(),
        pinned: anchors.has(target.id),
        anchor: anchors.has(target.id) ? anchors.get(target.id).slice() : null,
      })),
    };
  }
  function remember() {
    history.push(entry());
    if (history.length > 32) history.shift();
  }
  function place(id, position) {
    const result = validate(id, position);
    if (!result.ok) return result;
    const previous = anchors.get(id);
    if (previous && previous.every((v, i) => v === result.position[i])) {
      return {
        ok: true,
        changed: false,
        reason: "This limb is already pinned at that position.",
      };
    }
    remember();
    anchors.set(id, result.position);
    confirmed = false;
    return {
      ok: true,
      changed: true,
      reason:
        (previous ? "Repositioned " : "Pinned ") + byId.get(id).label + ".",
    };
  }
  function remove(id) {
    if (!anchors.has(id))
      return {
        ok: false,
        code: "missing",
        reason: "That limb does not have a pin to remove.",
      };
    remember();
    anchors.delete(id);
    confirmed = false;
    return {
      ok: true,
      changed: true,
      reason: "Removed the pin from " + byId.get(id).label + ".",
    };
  }
  function undo() {
    if (!history.length)
      return {
        ok: false,
        code: "history",
        reason: "There is no pin placement to undo.",
      };
    const prior = decode(history.pop());
    anchors = prior.anchors;
    // Undo is always a return to inspection, never a hidden Continue operation.
    confirmed = false;
    return {
      ok: true,
      changed: true,
      reason: "Last pin change undone. Check the anchors before continuing.",
    };
  }
  function reset() {
    anchors = new Map();
    confirmed = false;
    history = [];
    restoreError = null;
    return {
      ok: true,
      changed: true,
      reason: "Pinning restarted. Secure the four distal limbs.",
    };
  }
  function continueStep() {
    if (!snapshot().canContinue && !confirmed)
      return {
        ok: false,
        code: "prerequisite",
        reason: "Secure all four distal limbs before continuing.",
      };
    confirmed = true;
    return {
      ok: true,
      changed: true,
      reason:
        "Four limbs secured. The specimen is stable; continue to the skin incision.",
    };
  }
  function serialize() {
    return JSON.stringify({
      version: 1,
      specimenId,
      configKey,
      ...entry(),
      history: history.map(cloneEntry),
    });
  }
  return {
    validate,
    place,
    remove,
    undo,
    reset,
    continueStep,
    snapshot,
    serialize,
  };
}
