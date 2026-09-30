export function SiteHeader() {
  return (
    <header className="site-id" aria-label="FlightWell team and problem statement">
      <div className="site-id-top">
        <p className="site-id-name">FlightWell</p>
        <p className="site-id-team">
          <span className="site-id-label">Team Name</span> Shubham Shah
          <span className="site-id-sep" aria-hidden="true" />
          <span className="site-id-label">Team ID</span> 193673
        </p>
      </div>
      <dl className="site-id-meta">
        <div>
          <dt>Problem Statement ID</dt>
          <dd>26054</dd>
        </div>
        <div>
          <dt>Theme</dt>
          <dd>Robotics and Drones</dd>
        </div>
        <div>
          <dt>PS Category</dt>
          <dd>Software</dd>
        </div>
      </dl>
      <p className="site-id-title">
        <span className="site-id-label">Problem Statement Title</span>
        AI-Enabled Real-Time Digital Twin System for Health Monitoring, Fault Prediction and Mission
        Reliability Enhancement of Aero Piston Engines used in MALE UAVs
      </p>
    </header>
  );
}
