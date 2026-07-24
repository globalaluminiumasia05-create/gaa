// 1. INIT SUPABASE
const supabaseClient = window.supabase.createClient(
  'https://rnjcegrickextgauquds.supabase.co',
  'sb_publishable_IFC69sXVYOmG78SgH0ELAA_lrne_C7Y'
);

// 1b. INIT EMAILJS
emailjs.init('x1VcUhWFITvl6g0hi');

// 2. AMBIL FORM
const form = document.querySelector('.contact-form');
const btn = form.querySelector('button');

// 3. HANDLE SUBMIT
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  btn.disabled = true;
  btn.innerText = 'Sending...';

  const data = {
    full_name: form.full_name.value || '',
    company_name: form.company_name?.value || '',
    phone: form.phone.value || '',
    email: form.email.value || '',
    product: form.product?.value || '',
    estimated_volume: form.estimated_volume?.value || '',
    city: form.city?.value || '',
    message: form.message.value || '',
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
    await emailjs.send('service_zmaspzr', 'template_r5lxmnm', data);
  } catch (emailError) {
    console.error('Gagal kirim notifikasi email:', emailError);
  }

  document.getElementById('successMsg').style.display = 'block';
  form.reset();

  btn.innerText = 'Sent ✓';
});