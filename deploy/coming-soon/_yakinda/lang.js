// TR/EN switch for the "Pek yakında" page. Turkish is in the HTML; English replaces it.
// The choice is kept in localStorage only (no cookie, nothing sent anywhere).
(function () {
  var en = {
    title: 'otosanayide. · Coming soon',
    langAria: 'Language: English. Switch to Turkish.',
    eyebrow: 'COMING SOON · 41 PROVINCES',
    h1: 'We’re in the workshop.<br>Soon we’ll be<br><em>on the road.</em>',
    leadLong: 'We’re making the final adjustments so you can find a mechanic who’ll take good care of your car on the first try. Comparing services, getting quotes and keeping your car’s calendar are almost here.',
    leadShort: 'We’re making the final adjustments so you can find a mechanic who’ll take good care of your car on the first try. Almost there.',
    check1: 'No sign-up needed',
    check2: '41 provinces',
    check3: '20 categories',
    badge1: 'COMING',
    badge2: 'SOON',
    statusEyebrow: 'PROGRESS',
    statusTitle: 'Step 2 of 3',
    step1: 'Design',
    step1State: 'Done',
    step2: 'Development',
    step2State: 'In progress',
    step3: 'Test drive',
    step3State: 'Up next',
    featuresEyebrow: 'AT LAUNCH',
    featuresTitle: 'What’s waiting for you?',
    featuresTitleShort: 'What’s waiting for you at launch?',
    soon: 'Soon',
    card1Title: 'Symptom Finder',
    card1Text: 'No need to know what the fault is called; pick the symptom and go to the right mechanic.',
    card2Title: 'One request, many quotes',
    card2Text: 'Describe the job once; see the price and appointment time before the work starts.',
    card3Title: 'My Garage',
    card3Text: 'Let us remind you of inspection, insurance and service dates.',
    businessEyebrow: 'FOR BUSINESSES',
    businessTitle: 'Own a business? Claim your spot on the list at launch.',
    businessTitleShort: 'Claim your spot at launch.',
    businessText: 'When we open, you’ll be able to create your business profile for free. Listing and ownership verification are free.',
    businessTextShort: 'When we open, you’ll be able to create your business profile for free.',
    privacy: 'Privacy and KVKK',
    cookies: 'Cookie preferences',
    contact: 'Contact'
  };

  var tr = {};
  var textNodes = document.querySelectorAll('[data-i18n]');
  var htmlNodes = document.querySelectorAll('[data-i18n-html]');
  var ariaNodes = document.querySelectorAll('[data-i18n-aria]');
  textNodes.forEach(function (el) { tr[el.getAttribute('data-i18n')] = el.textContent; });
  htmlNodes.forEach(function (el) { tr[el.getAttribute('data-i18n-html')] = el.innerHTML; });
  ariaNodes.forEach(function (el) { tr[el.getAttribute('data-i18n-aria')] = el.getAttribute('aria-label'); });

  function apply(lang) {
    var dict = lang === 'en' ? en : tr;
    textNodes.forEach(function (el) { el.textContent = dict[el.getAttribute('data-i18n')]; });
    htmlNodes.forEach(function (el) { el.innerHTML = dict[el.getAttribute('data-i18n-html')]; });
    ariaNodes.forEach(function (el) { el.setAttribute('aria-label', dict[el.getAttribute('data-i18n-aria')]); });
    document.documentElement.lang = lang;
    document.getElementById('lang-code').textContent = lang.toUpperCase();
  }

  var current = 'tr';
  try { if (localStorage.getItem('otosanayide-lang') === 'en') current = 'en'; } catch (e) {}
  if (current === 'en') apply('en');

  document.getElementById('lang-toggle').addEventListener('click', function () {
    current = current === 'tr' ? 'en' : 'tr';
    apply(current);
    try { localStorage.setItem('otosanayide-lang', current); } catch (e) {}
  });
})();
