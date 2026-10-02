export default function Contact() {
  return (
    <section className="dx-cta" id="contact">
      <div className="wrap dx-cta-in">
        <div style={{ display: 'grid', gap: '2rem', justifyItems: 'start' }}>
          <h2 className="dx-h2" data-split>Let&rsquo;s move your business.</h2>
          <div className="dx-actions" data-reveal>
            <a className="btn solid magnetic" href="https://wa.me/919353032343" target="_blank" rel="noopener"><span>Message the dispatch desk</span></a>
            <a className="dx-phone" href="tel:+919353032343">+91 93530 32343</a>
          </div>
        </div>
        <div className="dx-cta-side" data-reveal="1">
          <p>Tell us what you ship and where. The dispatch desk calls back within a working hour with a rate and the next departure.</p>
          <div className="ct-rows">
            <div><span>Dispatch desk</span><a href="tel:+919353032343">+91 93530 32343</a></div>
            <div><span>Hyderabad lane</span><a href="tel:+919632939298">+91 96329 39298</a></div>
            <div><span>Email</span><b>csdexpressllp@gmail.com</b><button className="copy" type="button" data-copy="csdexpressllp@gmail.com">Copy</button></div>
            <div><span>Office</span><b>Konena Agrahara, Bengaluru 560017</b></div>
          </div>
        </div>
      </div>
    </section>
  );
}
