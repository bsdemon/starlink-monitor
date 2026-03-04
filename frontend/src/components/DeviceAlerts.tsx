type Props = {
  alerts?: number[];
  alertsMap?: Record<number, string>;
};

export function DeviceAlerts({ alerts, alertsMap }: Props) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="alertsBox">
      <div className="alertsHeader">Active alerts ({alerts.length})</div>

      <ul className="alertsList">
        {alerts.map((id) => {
          const name = alertsMap?.[id] ?? null;
          return (
            <li key={id} className="alertItem">
              {name ? name : `${id}`}
            </li>
          );
        })}
      </ul>
    </div>
  );
}