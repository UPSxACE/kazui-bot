export function inGroup(status: string) {
  return (
    status === "member" || status === "administrator" || status === "creator"
  );
}
