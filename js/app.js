// 1. INIT SUPABASE
const supabaseClient = window.supabase.createClient(
  'https://rnjcegrickextgauquds.supabase.co',
  'sb_publishable_IFC69sXVYOmG78SgH0ELAA_lrne_C7Y'
);

// 1b. INIT EMAILJS
emailjs.init('x1VcUhWFITvl6g0hi');

// 2. AMBIL FORM
const enquiryForm = document.querySelector('.contact-form');
const contactForm = document.querySelector('.contact-message-form');

if (enquiryForm) {
  const btn = enquiryForm.querySelector('button');

  enquiryForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    btn.disabled = true;
    btn.innerText = 'Sending...';

    const data = {
      full_name: enquiryForm.full_name.value || '',
      company_name: enquiryForm.company_name?.value || null,
      phone: enquiryForm.phone.value || '',
      email: enquiryForm.email?.value || null,
      product: enquiryForm.product?.value || null,
      estimated_volume: enquiryForm.estimated_volume?.value || null,
      city: enquiryForm.city?.value || null,
      message: enquiryForm.message?.value || null,
    };

    const { error } = await supabaseClient
      .from('enquiries')
      .insert([data]);

    if (error) {
      console.error(error);
      alert('❌ Gagal kirim: ' + error.message);

      btn.disabled = false;
      btn.innerText = 'Send Enquiry →';
      return;
    }
    
    try {
      await emailjs.send(
        'service_zmaspzr',
        'template_r5lxmnm',
        data
      );
    } catch (emailError) {
      console.error(emailError);
    }
    
    document.getElementById('successMsg').style.display = 'block';
    
    enquiryForm.reset();
    
    btn.disabled = false;
    btn.innerText = 'Sent ✓';
    
    setTimeout(() => {
      btn.innerText = 'Send Inquiry';
    }, 2500);
  });
}

if (contactForm) {
  const btn = contactForm.querySelector('button');

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    btn.disabled = true;
    btn.innerText = 'Sending...';

    const data = {
      full_name: contactForm.full_name.value || '',
      email: contactForm.email.value || '',
      message: contactForm.message.value || ''
    };

    const { error } = await supabaseClient
      .from('contact_messages')
      .insert([data]);

    if (error) {
      console.error(error);
      alert('❌ Gagal kirim: ' + error.message);

      btn.disabled = false;
      btn.innerText = 'Send Enquiry';
      return;
    }

    try {
      await emailjs.send(
        'service_zmaspzr',
        'template_68odi6m',
        data
      );
    } catch (emailError) {
      console.error(emailError);
    }

    contactForm.reset();

    btn.disabled = false;
    btn.innerText = 'Sent ✓';
    
    setTimeout(() => {
      btn.innerText = 'Send Enquiry';
    }, 2500);
  });
}