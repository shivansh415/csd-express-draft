const reasons = [
  ['Regular dispatch planning', 'Designed for repeat business and predictable movement, week after week.'],
  ['Part load and full truck', 'Share a scheduled run or take a dedicated vehicle. Same lanes, same discipline.'],
  ['Business-focused handling', 'Documentation checked at booking, loads manifested, dispatch out-scanned.'],
  ['South India connectivity', 'An existing network footprint supports expansion beyond the launch lanes.'],
];

export default function WhyUs() {
  return (
    <section className="dx-section" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="why" style={{ marginTop: 0 }}>
          {reasons.map(([title, text], i) => (
            <div className="why-col" key={title} data-reveal={i}>
              <span className="no">0{i + 1}</span>
              <div><b>{title}</b><p>{text}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
