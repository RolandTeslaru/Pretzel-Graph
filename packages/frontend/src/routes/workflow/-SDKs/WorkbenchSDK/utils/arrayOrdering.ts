// small helpers
export const removeInPlace = <T,>(arr: T[], item: T) => {
  const idx = arr.indexOf(item);
  if (idx !== -1) arr.splice(idx, 1);
};

export const insertBeforeOrEndInPlace = <T,>(arr: T[], item: T, before: T | null) => {
  removeInPlace(arr, item);
  if (before == null) {
    arr.push(item);
    return;
  }
  const idx = arr.indexOf(before);
  if (idx === -1) arr.push(item);
  else arr.splice(idx, 0, item);
};

export const moveInArray = <T,>(arr: T[], from: number, to: number) => {
  if (from === to || from < 0 || to < 0) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

export const reorderSubsetInPlace = <T,>(
  full: T[],
  predicate: (item: T) => boolean,
  active: T,
  over: T,
) => {
  const subset = full.filter(predicate);
  const from = subset.indexOf(active);
  const to = subset.indexOf(over);
  if (from === -1 || to === -1) return;

  const nextSubset = moveInArray(subset, from, to);

  let i = 0;
  for (let j = 0; j < full.length; j++) {
    if (predicate(full[j])) full[j] = nextSubset[i++]!;
  }
};

