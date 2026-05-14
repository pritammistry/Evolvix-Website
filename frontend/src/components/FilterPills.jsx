export function FilterPills({ items, active, setActive, testPrefix }) {
  return <div className="filter-pills" data-testid={`${testPrefix}-filter-pills`}>{items.map((item) => <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)} data-testid={`${testPrefix}-filter-${item.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-button`}>{item}</button>)}</div>;
}