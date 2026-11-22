export default function AuthLoading() {
  return (
    <div className="route-feedback route-feedback--loading" role="status" aria-live="polite" aria-busy="true">
      <p className="eyebrow">RALLY</p>
      <p>Loading account access…</p>
    </div>
  );
}
