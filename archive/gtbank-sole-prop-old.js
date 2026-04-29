// ─────────────────────────────────────────────────────────────────────────────
// GTBank Sole Prop / Partnership — form configuration
// Loaded by form.html; depends on globals set by form-engine.js (FD, autoSave)
// ─────────────────────────────────────────────────────────────────────────────

// ── DATA ARRAYS ───────────────────────────────────────────────────────────────
const STATES=['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna',
  'Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo',
  'Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara','FCT — Abuja'];
const SECTORS=['Agriculture & Agro-Allied','Construction & Real Estate','Education',
  'Finance & Insurance','Healthcare & Pharmaceuticals','Hospitality & Tourism',
  'ICT & Technology','Legal & Professional Services','Manufacturing','Mining & Quarrying',
  'Oil & Gas','Retail & Trade','Transport & Logistics','Other'];
const TITLES=['Mr','Mrs','Miss','Ms','Dr','Prof','Alhaji','Alhaja','Chief','Engr','Barr','Hon','Rev'];
const COUNTRIES=['Afghanistan','Albania','Algeria','Angola','Argentina','Australia','Austria','Bangladesh',
  'Belgium','Benin','Brazil','Burkina Faso','Cameroon','Canada','Chad','China','Congo (DRC)',
  'Côte d\'Ivoire','Egypt','Ethiopia','France','Gambia','Germany','Ghana','Guinea','India',
  'Indonesia','Iran','Iraq','Italy','Japan','Kenya','Lebanon','Liberia','Libya','Mali',
  'Morocco','Mozambique','Netherlands','Niger','Pakistan','Philippines','Saudi Arabia',
  'Senegal','Sierra Leone','Somalia','South Africa','Spain','Sudan','Tanzania','Togo',
  'Tunisia','Turkey','Uganda','United Kingdom','United States','Zimbabwe','Other'];
const DNFI_LIST=[
  'Dealers in Luxury Goods','Dealers in Jewellery','Car Dealers','Supermarket',
  'Hotels and Hospitality Business(es)','Casinos, Pool Betting & Lottery Businesses',
  'Audit Firms','Tax Consultants','Accounting Firms','Estate Surveyors and Valuers',
  'Dealers in Real Estate','Mechanized Farming','Construction Companies',
  'Mortgage Brokers','Consulting Companies','Clearing & Forwarding Companies',
  'Dealers in Precious Metal & Stones','Non-Profit Organizations (NPOs)',
];

// ── ID TYPES ──────────────────────────────────────────────────────────────────
const ID_CFG={
  "National ID (NIN)":       {fields:['number']},
  "Driver's Licence":        {fields:['number','issue','expiry']},
  "International Passport":  {fields:['number','issue','expiry']},
  "Voter's Card":            {fields:['number']},
};
const ID_KEYS=Object.keys(ID_CFG);

// ── ACCOUNT PRODUCTS ──────────────────────────────────────────────────────────
const ACCT_PRODUCTS = [
  {
    id:'current', name:'Current Account', icon:'🏦',
    desc:'Standard day-to-day business account', variants:null,
    features:['Cheque book & debit card','Online banking (GAPS)','₦1/mille COT on transactions'],
  },
  {
    id:'gtbusiness', name:'GT Business Account', icon:'💼',
    desc:'SME-focused account with CAMF-free monthly turnover',
    variants:[
      {id:'silver',name:'GT Business Silver',badge:'< ₦20M revenue',meta:'Min bal ₦10,000 · ₦2,000 fixed monthly charge · ₦20M CAMF-free'},
      {id:'gold',  name:'GT Business Gold',  badge:'₦20M – ₦50M revenue',meta:'Min bal ₦20,000 · ₦5,000 fixed monthly charge · ₦50M CAMF-free'},
      {id:'platinum',name:'GT Business Platinum',badge:'> ₦50M revenue',meta:'Min bal ₦50,000 · ₦10,000 fixed monthly charge · ₦100M CAMF-free'},
    ],
    features:['Corporate & sole prop card','Loans & advances access','Annual business workshops'],
  },
  {
    id:'gtmax', name:'GTMax Account', icon:'📈',
    desc:'Maximum interest on your daily balance · minimum charges on your transactions',
    variants:[
      {id:'silver',  name:'GTMax Silver',   badge:'4.75% p.a.',meta:'Min opening ₦150,000 · Min balance ₦100,000'},
      {id:'gold',    name:'GTMax Gold',     badge:'5.00% p.a.',meta:'Min opening ₦500,000 · Min balance ₦250,000'},
      {id:'platinum',name:'GTMax Platinum', badge:'5.25% p.a.',meta:'Min opening ₦1,000,000 · Min balance ₦500,000'},
    ],
    features:['COT free · Free cheque books','Naira MasterCard','Non-borrowing account'],
    conditions:'Max 5 free withdrawals/month — exceeding this applies ₦1/mille COT on ALL transactions that month. Must maintain minimum balance — falling below forfeits interest and triggers ₦1/mille COT.',
  },
  {
    id:'gtbiz_premium', name:'GTBusiness Premium', icon:'⭐',
    desc:'For corporates with annual revenue ₦10BN – ₦50BN', variants:null,
    features:['Zero CAMF up to ₦2BN/month','Min balance ₦500,000','Free corporate card & cheque book'],
  },
];

const DOMI_CURRENCIES = [
  {id:'usd',flag:'🇺🇸',name:'US Dollar (USD)',sub:'American Dollar account'},
  {id:'eur',flag:'🇪🇺',name:'Euro (EUR)',sub:'European Euro account'},
  {id:'gbp',flag:'🇬🇧',name:'British Pound (GBP)',sub:'Sterling Pound account'},
];

// ── SECTION LABELS ────────────────────────────────────────────────────────────
const SEC = {
  BIZ:'📋 Business Info',
  ADDR:'📍 Address & Contact',
  SIG1:'👤 About You',
  SIG2:'👤 Signatory 2',
  SIGS:'👥 Signatories',
  SVCS:'⚙️ Account Services',
  NOK:'👨‍👩‍👧 Next of Kin',
  LEGAL:'📜 Consents',
  DOCS:'📎 Documents',
};

// ── SLIDES ────────────────────────────────────────────────────────────────────
const SLIDES=[
// 0
{type:'welcome'},

// ══════════ BUSINESS (1–11) ══════════
{type:'section',sec:SEC.BIZ,emoji:'🏢',q:'Let\'s start with\nyour business',sub:'We\'ll collect your registration details, address, and contact information. Takes about 3 minutes.'},
{type:'choice',sec:SEC.BIZ,id:'bizCategory',emoji:'🏪',q:'What type of business\nare you registering?',required:true,opts:[
  {key:'A',val:'Sole Proprietorship',label:'Sole Proprietorship',sub:'Owned by one individual'},
  {key:'B',val:'Partnership',label:'Partnership',sub:'Two or more people sharing ownership'},
]},
{type:'account-product',sec:SEC.BIZ,emoji:'🏦',q:'Which account would\nyou like to open?',sub:'Choose your naira account.',required:true},
{type:'domiciliary',sec:SEC.BIZ,emoji:'💱',q:'Add a domiciliary\naccount?',sub:'Optional — select the currencies you\'d like. No extra documents needed.'},
{type:'group',sec:SEC.BIZ,emoji:'📋',q:'Business name & registration',sub:'Exactly as registered with CAC.',fields:[
  {id:'bizName',label:'Business name *',placeholder:'e.g. Adeyemi Ventures',type:'text',required:true},
  {id:'bizRegNumber',label:'CAC number (BN / RC)',placeholder:'e.g. BN 1234567',type:'text',required:false},
  {id:'bizRegDate',label:'Date of registration',type:'date',required:false},
  {id:'bizRegState',label:'State of registration',type:'select',opts:['Select state',...STATES],required:false},
]},
{type:'group',sec:SEC.BIZ,emoji:'💼',q:'Business activity & size',sub:'',fields:[
  {id:'bizNature',label:'Type / nature of business *',placeholder:'e.g. Retail trading, IT consulting',type:'text',required:true},
  {id:'bizSector',label:'Sector / industry',type:'select',opts:['Select sector',...SECTORS],required:false},
  {id:'bizTurnover',label:'Estimated annual turnover',type:'select',opts:['Select range','Less than ₦50M','₦50M – ₦500M','₦500M – ₦5B','Above ₦5B'],required:false,matchAs:'exact'},
]},
{type:'group',sec:SEC.BIZ,emoji:'🔢',q:'Tax & compliance',sub:'',fields:[
  {id:'bizTIN',label:'Tax Identification Number (TIN) *',placeholder:'e.g. 2522535865787',type:'text',required:true,hint:'Don\'t know your TIN? <a href="https://taxid.nrs.gov.ng/" target="_blank" rel="noopener" style="color:var(--orange)">Look it up here →</a>'},
  {id:'bizCRM',label:'CRM No / Borrower\'s code',placeholder:'Where applicable',type:'text',required:false},
],extraId:'scuml-block'},
{type:'group',sec:SEC.ADDR,emoji:'🏠',q:'Business operating address',sub:'Your registered operating address.',fields:[
  {id:'bizHousePlot',label:'House / plot number',placeholder:'e.g. 12',type:'text',required:false},
  {id:'bizAddr1',label:'Street name *',placeholder:'e.g. Broad Street',type:'text',required:true},
  {id:'bizBusStop',label:'Nearest bus stop / landmark',placeholder:'e.g. Near Shoprite, Ikeja',type:'text',required:false},
  {id:'bizCity',label:'City / town *',placeholder:'e.g. Lagos',type:'text',required:true},
  {id:'bizLGA',label:'LGA (Local Govt. Area)',placeholder:'e.g. Lagos Island',type:'text',required:false},
  {id:'bizState',label:'State *',type:'select',opts:['Select state',...STATES],required:true},
]},
{type:'choice',sec:SEC.ADDR,emoji:'📋',q:'Is the address on your CAC the same as your operating address?',sub:'Check your CAC certificate.',id:'sameAsOpAddr',opts:[
  {key:'A',val:'YES',label:'Yes — same address'},
  {key:'B',val:'NO', label:'No — different address'},
]},
{type:'group',sec:SEC.ADDR,emoji:'🏢',q:'Registered Business Address',sub:'Enter exactly as it appears on your CAC certificate — one line.',
  skip:()=>FD.sameAsOpAddr!=='NO',
  fields:[
    {id:'bizRegAddress',label:'Registered address *',placeholder:'e.g. 1 Yaya Close, Casco, Lagos State',type:'text',required:true},
  ]
},
{type:'group',sec:SEC.ADDR,emoji:'📞',q:'Business contact details',sub:'GTBank uses these for account notifications.',fields:[
  {id:'bizMobile',label:'Business mobile number *',placeholder:'e.g. 08012345678',type:'tel',required:true},
  {id:'bizEmail',label:'Business email address *',placeholder:'contact@yourbusiness.com',type:'email',required:true},
  {id:'bizPhone',label:'Office phone (landline)',placeholder:'Optional',type:'tel',required:false},
  {id:'bizWebsite',label:'Website',placeholder:'www.yourbusiness.com (optional)',type:'text',required:false},
]},

// ══════════ SIGNATORY 1 (12–23) ══════════
{type:'section',sec:SEC.SIG1,emoji:'👤',q:'About you —\nthe account signatory',sub:'Personal details of the business owner or primary signatory.'},
{type:'group',sec:SEC.SIG1,emoji:'✍️',q:'Your full name',sub:'As it appears on your valid ID.',fields:[
  {id:'s1Title',label:'Title',type:'select',opts:['Select title',...TITLES],required:false},
  {id:'s1Surname',label:'Surname *',placeholder:'e.g. Okonkwo',type:'text',required:true},
  {id:'s1FirstName',label:'First name *',placeholder:'e.g. Ada',type:'text',required:true},
  {id:'s1OtherNames',label:'Other names',placeholder:'Middle name(s)',type:'text',required:false},
]},
{type:'group',sec:SEC.SIG1,emoji:'🧑',q:'Personal details',sub:'',fields:[
  {id:'s1Gender',label:'Gender *',type:'select',opts:['Select','Male','Female'],required:true},
  {id:'s1Marital',label:'Marital status',type:'select',opts:['Select','Single','Married','Divorced','Widowed'],required:false},
  {id:'s1DOB',label:'Date of birth *',type:'date',required:true},
  {id:'s1PlaceOfBirth',label:'Place of birth',placeholder:'e.g. Lagos',type:'text',required:false},
  {id:'s1MothersName',label:"Mother's maiden name",placeholder:"Your mother's surname at birth",type:'text',required:false},
  {id:'s1StateOrigin',label:'State of origin',type:'select',opts:['Select state',...STATES],required:false},
  {id:'s1LGAOrigin',label:'LGA of origin',placeholder:'e.g. Onitsha North',type:'text',required:false},
]},
{type:'nationality',sec:SEC.SIG1,id:'s1Nationality',prefix:'s1',emoji:'🌍',q:'What is your nationality?',required:true},
{type:'other-residency',sec:SEC.SIG1,id:'s1OtherResidency',prefix:'s1',emoji:'🌐',q:'Do you have residency\nin any other country?',required:false},
{type:'bvn',sec:SEC.SIG1,id:'s1BVN',emoji:'🔐',q:'Your Bank Verification\nNumber (BVN)',sub:'Your 11-digit BVN — dial *565*0# on your registered phone to confirm.',placeholder:'Enter 11-digit BVN',required:true},
{type:'id-select',sec:SEC.SIG1,idField:'s1IDType',prefix:'s1',emoji:'🪪',q:'Which ID document\nwill you use?',sub:'Choose your valid, unexpired ID.',required:true},
{type:'group',sec:SEC.SIG1,emoji:'📱',q:'Contact & role',sub:'',fields:[
  {id:'s1Mobile',label:'Mobile number *',placeholder:'08012345678',type:'tel',required:true},
  {id:'s1Phone',label:'Alternate phone',placeholder:'Optional landline',type:'tel',required:false},
  {id:'s1Email',label:'Personal email',placeholder:'your@email.com',type:'email',required:false},
  {id:'s1Occupation',label:'Occupation',placeholder:'e.g. Business owner',type:'text',required:false},
  {id:'s1JobTitle',label:'Job title / status',placeholder:'e.g. Managing Director',type:'text',required:false},
  {id:'s1Position',label:'Position in the firm',placeholder:'e.g. Sole Proprietor',type:'text',required:false},
  {id:'s1TIN',label:'Personal TIN (if available)',placeholder:'Tax ID number',type:'text',required:false},
]},
{type:'address',sec:SEC.SIG1,prefix:'s1Res',sigPfx:'s1',emoji:'🏡',q:'Your residential address',sub:'Your home address. Toggle below if same as business address.',required:true},
{type:'choice',sec:SEC.SIG1,emoji:'📬',id:'s1SameMailAddr',q:'Is your mailing address\nthe same as your residential?',sub:'Where GTBank will send physical correspondence.',required:true,opts:[
  {key:'A',val:'YES',label:'Yes — same address'},
  {key:'B',val:'NO', label:'No — different address'},
]},
{type:'group',sec:SEC.SIG1,emoji:'📮',q:'Mailing address',sub:'Enter the address where you\'d like to receive mail.',
  skip:()=>FD.s1SameMailAddr!=='NO',
  fields:[
    {id:'s1MailHouse', label:'House / plot number', placeholder:'e.g. 12', type:'text', required:false},
    {id:'s1MailStreet',label:'Street name *', placeholder:'e.g. Broad Street', type:'text', required:true},
    {id:'s1MailCity',  label:'City / town', placeholder:'e.g. Lagos', type:'text', required:false},
    {id:'s1MailState', label:'State', type:'select', opts:['Select state',...STATES], required:false},
]},
{type:'signature',sec:SEC.SIG1,id:'s1Signature',emoji:'✍️',q:'Your signature',sub:'Sign on plain white paper, take a clear photo. We\'ll clean it up.'},

// ══════════ NEXT OF KIN (24–25) ══════════
{type:'section',sec:SEC.NOK,emoji:'👨‍👩‍👧',q:'Next of kin',sub:'Someone GTBank can contact on your behalf in an emergency.'},
{type:'group',sec:SEC.NOK,emoji:'👤',q:'Next of kin details',sub:'',fields:[
  {id:'nokSurname',label:'Surname *',placeholder:'Surname',type:'text',required:true},
  {id:'nokFirstName',label:'First name *',placeholder:'First name',type:'text',required:true},
  {id:'nokOtherNames',label:'Other names',placeholder:'Optional',type:'text',required:false},
  {id:'nokRelationship',label:'Relationship to you *',type:'select',opts:['Select','Spouse','Child','Parent','Sibling','Uncle/Aunt','Cousin','Friend','Other'],required:true},
  {id:'nokDOB',label:'Date of birth',type:'date',required:false},
  {id:'nokGender',label:'Gender',type:'select',opts:['Select','Male','Female'],required:false},
  {id:'nokMobile',label:'Mobile number',placeholder:'08012345678',type:'tel',required:false},
]},
{type:'group',sec:SEC.NOK,emoji:'🏠',q:'Next of kin address',sub:'',fields:[
  {id:'nokHousePlot',label:'House / plot number',placeholder:'e.g. 12',type:'text',required:false},
  {id:'nokStreet',label:'Street name',placeholder:'e.g. Broad Street',type:'text',required:false},
  {id:'nokCity',label:'City / town',placeholder:'e.g. Lagos',type:'text',required:false},
  {id:'nokState',label:'State',type:'select',opts:['Select state',...STATES],required:false},
  {id:'nokEmail',label:'Email address',placeholder:'Optional',type:'email',required:false},
]},

// ══════════ SIGNATORIES (27) ══════════
{type:'add-signatories',sec:SEC.SIGS},

// ══════════ SIGNATORY 2 (28–39) — shown if _hasS2 or S2_ROLE ══════════
{type:'section',sec:SEC.SIG2,emoji:'👤',s2slide:true,q:'Signatory 2 details',sub:'Personal details of the second account signatory.',
  skip:()=>!S2_ROLE&&!FD._hasS2},
{type:'group',sec:SEC.SIG2,s2slide:true,prefix:'s2',emoji:'✍️',q:'Signatory 2 full name',sub:'As it appears on their valid ID.',
  skip:()=>!S2_ROLE&&!FD._hasS2,
  fields:[
  {id:'s2Title',label:'Title',type:'select',opts:['Select title',...TITLES],required:false},
  {id:'s2Surname',label:'Surname *',placeholder:'e.g. Okonkwo',type:'text',required:true},
  {id:'s2FirstName',label:'First name *',placeholder:'e.g. Ada',type:'text',required:true},
  {id:'s2OtherNames',label:'Other names',placeholder:'Middle name(s)',type:'text',required:false},
]},
{type:'group',sec:SEC.SIG2,s2slide:true,prefix:'s2',emoji:'🧑',q:'Personal details',sub:'',
  skip:()=>!S2_ROLE&&!FD._hasS2,
  fields:[
  {id:'s2Gender',label:'Gender *',type:'select',opts:['Select','Male','Female'],required:true},
  {id:'s2Marital',label:'Marital status',type:'select',opts:['Select','Single','Married','Divorced','Widowed'],required:false},
  {id:'s2DOB',label:'Date of birth *',type:'date',required:true},
  {id:'s2PlaceOfBirth',label:'Place of birth',placeholder:'e.g. Lagos',type:'text',required:false},
  {id:'s2MothersName',label:"Mother's maiden name",placeholder:"Your mother's surname at birth",type:'text',required:false},
  {id:'s2StateOrigin',label:'State of origin',type:'select',opts:['Select state',...STATES],required:false},
  {id:'s2LGAOrigin',label:'LGA of origin',placeholder:'e.g. Onitsha North',type:'text',required:false},
]},
{type:'nationality',sec:SEC.SIG2,s2slide:true,id:'s2Nationality',prefix:'s2',emoji:'🌍',q:'Nationality of Signatory 2?',required:true,
  skip:()=>!S2_ROLE&&!FD._hasS2},
{type:'other-residency',sec:SEC.SIG2,s2slide:true,id:'s2OtherResidency',prefix:'s2',emoji:'🌐',q:'Does Signatory 2 have residency\nin any other country?',required:false,
  skip:()=>!S2_ROLE&&!FD._hasS2},
{type:'bvn',sec:SEC.SIG2,s2slide:true,id:'s2BVN',emoji:'🔐',q:'Signatory 2 BVN',sub:'Their 11-digit Bank Verification Number.',placeholder:'Enter 11-digit BVN',required:true,
  skip:()=>!S2_ROLE&&!FD._hasS2},
{type:'id-select',sec:SEC.SIG2,s2slide:true,idField:'s2IDType',prefix:'s2',emoji:'🪪',q:'Which ID document\nwill Signatory 2 use?',sub:'Choose their valid, unexpired ID.',required:true,
  skip:()=>!S2_ROLE&&!FD._hasS2},
{type:'group',sec:SEC.SIG2,s2slide:true,prefix:'s2',emoji:'📱',q:'Contact & role',sub:'',
  skip:()=>!S2_ROLE&&!FD._hasS2,
  fields:[
  {id:'s2Mobile',label:'Mobile number *',placeholder:'08012345678',type:'tel',required:true},
  {id:'s2Phone',label:'Alternate phone',placeholder:'Optional landline',type:'tel',required:false},
  {id:'s2Email',label:'Personal email',placeholder:'their@email.com',type:'email',required:false},
  {id:'s2Occupation',label:'Occupation',placeholder:'e.g. Business owner',type:'text',required:false},
  {id:'s2JobTitle',label:'Job title / status',placeholder:'e.g. Director',type:'text',required:false},
  {id:'s2Position',label:'Position in the firm',placeholder:'e.g. Partner',type:'text',required:false},
  {id:'s2TIN',label:'Personal TIN (if available)',placeholder:'Tax ID number',type:'text',required:false},
]},
{type:'address',sec:SEC.SIG2,s2slide:true,prefix:'s2Res',sigPfx:'s2',emoji:'🏡',q:'Signatory 2 residential address',sub:'Their home address.',required:true,
  skip:()=>!S2_ROLE&&!FD._hasS2},
{type:'choice',sec:SEC.SIG2,s2slide:true,emoji:'📬',id:'s2SameMailAddr',q:'Is their mailing address\nthe same as residential?',sub:'Where GTBank will send their correspondence.',required:true,
  skip:()=>!S2_ROLE&&!FD._hasS2,
  opts:[
  {key:'A',val:'YES',label:'Yes — same address'},
  {key:'B',val:'NO', label:'No — different address'},
]},
{type:'group',sec:SEC.SIG2,s2slide:true,emoji:'📮',q:'Signatory 2 mailing address',sub:'Enter their mailing address.',
  skip:()=>(!S2_ROLE&&!FD._hasS2)||FD.s2SameMailAddr!=='NO',
  fields:[
    {id:'s2MailHouse', label:'House / plot number', placeholder:'e.g. 12', type:'text', required:false},
    {id:'s2MailStreet',label:'Street name *', placeholder:'e.g. Broad Street', type:'text', required:true},
    {id:'s2MailCity',  label:'City / town', placeholder:'e.g. Lagos', type:'text', required:false},
    {id:'s2MailState', label:'State', type:'select', opts:['Select state',...STATES], required:false},
]},
{type:'signature',sec:SEC.SIG2,s2slide:true,id:'s2Signature',emoji:'✍️',q:'Signatory 2 signature',sub:'They should sign on plain white paper and take a clear photo.',
  skip:()=>!S2_ROLE&&!FD._hasS2},

// ══════════ ACCOUNT SERVICES (40–43) ══════════
{type:'section',sec:SEC.SVCS,emoji:'⚙️',q:'Account services',sub:'Set up online banking, choose your statement frequency, cheque book, and salary payment preferences.'},
{type:'choice',sec:SEC.SVCS,id:'onlineBanking',emoji:'💻',q:'Do you need\nonline banking?',optional:true,opts:[
  {key:'A',val:'GAPS-Lite',label:'GAPS-Lite',sub:'Single user, simple access'},
  {key:'B',val:'GAPS',label:'GAPS (Full access)',sub:'Multiple users, batch payments, approvals'},
  {key:'C',val:'Not required',label:'Not required right now'},
]},
{type:'group',sec:SEC.SVCS,emoji:'📄',q:'Statement & cheque book',sub:'',fields:[
  {id:'stmtFreq',label:'Account statement frequency',type:'select',opts:['Select','Monthly','Quarterly','Semi-Annually','Annually'],required:false},
  {id:'chequeBook',label:'Cheque book',type:'select',opts:['Select','25 Leaves','50 Leaves','100 Leaves','200 Leaves','Not required'],required:false},
],optional:true},
{type:'salary',sec:SEC.SVCS,emoji:'💰',q:'Will you use this account\nto pay staff salaries?'},

// ══════════ TERMS (44) ══════════
{type:'terms',sec:SEC.LEGAL},

// ══════════ DOCUMENTS (45–48) ══════════
{type:'section',sec:SEC.DOCS,emoji:'📎',q:'Supporting documents',sub:'Almost done! Attach your board resolution, ID, CAC certificate, and referee forms.'},
{type:'doc-board-res',sec:SEC.DOCS},
{type:'doc-uploads',sec:SEC.DOCS},
{type:'doc-references',sec:SEC.DOCS},

// ══════════ REVIEW → DONE (49–51) ══════════
{type:'review'},
{type:'processing'},
{type:'done'},
];

// ── PDF FIELD MAP ─────────────────────────────────────────────────────────────
// type:'text' → rows:[{x, yc, n}], bw, bh  (yc = PDF pts from bottom)
// type:'tick'  → x, y, bw, bh, match
const GTB_FIELDS = [
  // ── PAGE 3: Business / Entity Details ────────────────────────────────────────
  {type:'text',page:3,fd:'_acctNumber',   bw:16.52,bh:17, rows:[{x:342.8,yc:589.2,n:13}]},
  {type:'text',page:3,fd:'bizName',       bw:16.65,bh:17, rows:[{x:125.2,yc:534.5,n:26},{x:125.2,yc:515.4,n:26}]},
  {type:'text',page:3,fd:'bizRegNumber',  bw:16.65,bh:17, rows:[{x:158.4,yc:495.9,n:24}]},
  {type:'text',page:3,fd:'_bizRegDate_d', bw:15.37,bh:16.02,rows:[{x:183.25,yc:476.67,n:2}]},
  {type:'text',page:3,fd:'_bizRegDate_m', bw:15.37,bh:16.02,rows:[{x:220.75,yc:476.59,n:2}]},
  {type:'text',page:3,fd:'_bizRegDate_y', bw:15.37,bh:16.02,rows:[{x:258.32,yc:476.59,n:4}]},
  {type:'text',page:3,fd:'bizRegState',   bw:16.52,bh:17, rows:[{x:183.6,yc:443.4,n:9}]},
  {type:'text',page:3,fd:'bizNature',     bw:16.65,bh:17, rows:[{x:175.0,yc:419.8,n:23}]},
  {type:'text',page:3,fd:'bizSector',     bw:16.65,bh:17, rows:[{x:125.0,yc:397.2,n:26}]},
  {type:'text',page:3,fd:'_bizAddr1full', bw:16.65,bh:17, rows:[{x:208.0,yc:375.5,n:21},{x:208.3,yc:356.8,n:21},{x:208.0,yc:337.8,n:21},{x:208.0,yc:318.9,n:21}]},
  {type:'text',page:3,fd:'_bizRegAddr',   bw:16.65,bh:17, rows:[{x:158.1,yc:298.0,n:24}]},
  {type:'text',page:3,fd:'bizLGA',        bw:16.65,bh:17, rows:[{x:141.1,yc:272.1,n:25}]},
  {type:'text',page:3,fd:'bizState',      bw:16.65,bh:17, rows:[{x:141.1,yc:253.1,n:25}]},
  {type:'text',page:3,fd:'bizEmail',      bw:16.65,bh:17, rows:[{x:141.1,yc:233.4,n:25}]},
  {type:'text',page:3,fd:'bizWebsite',    bw:16.65,bh:17, rows:[{x:141.1,yc:212.8,n:25}]},
  {type:'text',page:3,fd:'bizMobile',     bw:16.65,bh:17, rows:[{x:126.38,yc:188.80,n:11}]},
  {type:'text',page:3,fd:'bizPhone',      bw:14.72,bh:17, rows:[{x:394.61,yc:188.80,n:11}]},
  {type:'text',page:3,fd:'bizTIN',          bw:14.33,bh:17, rows:[{x:194.27,yc:161.54,n:8}]},
  {type:'text',page:3,fd:'_bizTINoverflow', bw:14.33,bh:17, drawBox:true, rows:[{x:251.59,yc:144.54,n:4}]},
  {type:'text',page:3,fd:'bizCRM',          bw:15.18,bh:17, rows:[{x:435.3,yc:161.7,n:8}]},
  {type:'text',page:3,fd:'bizSCUML',      bw:16.65,bh:17, rows:[{x:275.2,yc:126.0,n:17}]},
  {type:'tick',page:3,fd:'bizCategory',match:'SOLE PROPRIETORSHIP',x:153.49,y:725.64,bw:17.19,bh:17.0},
  {type:'tick',page:3,fd:'bizCategory',match:'PARTNERSHIP',        x:265.48,y:725.64,bw:17.19,bh:17.0},
  {type:'tick',page:3,fd:'bizTurnover',match:'LESS THAN ₦50M',  x:232.18,y:54.27,bw:17.19,bh:17},
  {type:'tick',page:3,fd:'bizTurnover',match:'₦50M – ₦500M',   x:470.03,y:54.27,bw:17.19,bh:17},
  {type:'tick',page:3,fd:'bizTurnover',match:'₦500M – ₦5B',    x:232.18,y:31.77,bw:17.19,bh:17},
  {type:'tick',page:3,fd:'bizTurnover',match:'ABOVE ₦5B',      x:470.03,y:31.77,bw:17.19,bh:17},
  {type:'tick',page:3,fd:'_acctTypeTick',match:'C',x:93,    y:658.89,bw:17,bh:17,drawBox:true},
  {type:'tick',page:3,fd:'_acctTypeTick',match:'D',x:170.34,y:658.89,bw:17,bh:17},
  {type:'tick',page:3,fd:'_acctTypeTick',match:'O',x:469.16,y:660.64,bw:17,bh:17},
  {type:'tick',page:3,fd:'_domiUSD',match:'USD',x:305.91,y:658.90,bw:14,bh:14},
  {type:'tick',page:3,fd:'_domiEUR',match:'EUR',x:322.38,y:658.90,bw:14,bh:14},
  {type:'tick',page:3,fd:'_domiJPY',match:'JPY',x:339.28,y:658.90,bw:14,bh:14},
  {type:'tick',page:3,fd:'_domiGBP',match:'GBP',x:355.72,y:658.90,bw:14,bh:14},

  // ── PAGE 5: Signatory 1 ────────────────────────────────────────────────────
  {type:'text',page:5,fd:'s1Title',       bw:75.70,bh:17, rows:[{x:65.56,yc:792.62,n:1}], fullText:true},
  {type:'text',page:5,fd:'s1Surname',     bw:16.69,bh:17, rows:[{x:204.16,yc:792.62,n:22}]},
  {type:'text',page:5,fd:'s1FirstName',   bw:16.79,bh:17, rows:[{x:99.66,yc:758.39,n:27}]},
  {type:'text',page:5,fd:'s1OtherNames',  bw:16.79,bh:17, rows:[{x:116.39,yc:734.87,n:26}]},
  {type:'tick',page:5,fd:'s1Marital',match:'SINGLE',  x:156.26,y:714.68,bw:16.10,bh:17},
  {type:'tick',page:5,fd:'s1Marital',match:'MARRIED', x:220.17,y:714.68,bw:16.10,bh:17},
  {type:'tick',page:5,fd:'s1Gender', match:'MALE',    x:489.97,y:714.68,bw:16.11,bh:17},
  {type:'tick',page:5,fd:'s1Gender', match:'FEMALE',  x:548.84,y:714.68,bw:16.10,bh:17},
  {type:'text',page:5,fd:'_s1DOB_d',      bw:15.37,bh:16.02,rows:[{x:111.16,yc:683.15,n:2}]},
  {type:'text',page:5,fd:'_s1DOB_m',      bw:15.37,bh:16.02,rows:[{x:148.66,yc:683.08,n:2}]},
  {type:'text',page:5,fd:'_s1DOB_y',      bw:15.37,bh:16.02,rows:[{x:186.23,yc:683.08,n:4}]},
  {type:'text',page:5,fd:'s1PlaceOfBirth',bw:16.57,bh:17, rows:[{x:341.24,yc:683.54,n:13}]},
  {type:'text',page:5,fd:'s1MothersName', bw:16.98,bh:17, rows:[{x:163.76,yc:654.92,n:23}]},
  {type:'text',page:5,fd:'_nokNameFull',  bw:16.98,bh:17, rows:[{x:163.54,yc:635.07,n:23}]},
  {type:'text',page:5,fd:'s1LGAOrigin',   bw:15.60,bh:17, rows:[{x:118.91,yc:611.44,n:13}]},
  {type:'text',page:5,fd:'s1StateOrigin', bw:15.60,bh:17, rows:[{x:406.10,yc:611.44,n:10}]},
  {type:'text',page:5,fd:'s1TIN',         bw:16.57,bh:17, rows:[{x:150.41,yc:581.89,n:16}]},
  {type:'text',page:5,fd:'s1IDType',      bw:14.54,bh:17, rows:[{x:112.61,yc:550.01,n:12}]},
  {type:'text',page:5,fd:'s1IDNumber',    bw:15.92,bh:17, rows:[{x:366.57,yc:550.01,n:12}]},
  {type:'text',page:5,fd:'_s1IDIssue_d',  bw:15.37,bh:16.02,rows:[{x:115.25,yc:511.85,n:2}]},
  {type:'text',page:5,fd:'_s1IDIssue_m',  bw:15.37,bh:16.02,rows:[{x:152.74,yc:511.78,n:2}]},
  {type:'text',page:5,fd:'_s1IDIssue_y',  bw:15.37,bh:16.02,rows:[{x:190.32,yc:511.78,n:4}]},
  {type:'text',page:5,fd:'_s1IDExpiry_d', bw:15.37,bh:16.02,rows:[{x:403.85,yc:511.85,n:2}]},
  {type:'text',page:5,fd:'_s1IDExpiry_m', bw:15.37,bh:16.02,rows:[{x:441.35,yc:511.78,n:2}]},
  {type:'text',page:5,fd:'_s1IDExpiry_y', bw:15.37,bh:16.02,rows:[{x:478.92,yc:511.78,n:4}]},
  {type:'text',page:5,fd:'s1Occupation',  bw:15.45,bh:17, rows:[{x:101.05,yc:481.09,n:12}]},
  {type:'text',page:5,fd:'s1JobTitle',    bw:15.47,bh:17, rows:[{x:370.65,yc:481.09,n:13}]},
  {type:'text',page:5,fd:'s1Position',    bw:16.60,bh:17, rows:[{x:204.25,yc:459.60,n:21}]},
  {type:'tick',page:5,fd:'_natNigerian',match:'NIGERIAN',x:200.38,y:437.10,bw:16.65,bh:17},
  {type:'tick',page:5,fd:'_natOthers',  match:'OTHER',   x:265.38,y:437.10,bw:16.65,bh:17},
  {type:'text',page:5,fd:'s1NationalityCountry',bw:175,bh:17,rows:[{x:376,yc:437.10,n:1}],fullText:true},
  {type:'text',page:5,fd:'s1ResidentPermit',   bw:15.09,bh:17,   rows:[{x:140.00,yc:414.63,n:12}]},
  {type:'text',page:5,fd:'_s1PermitIssue_d',   bw:15.37,bh:16.02,rows:[{x:140.61,yc:381.85,n:2}]},
  {type:'text',page:5,fd:'_s1PermitIssue_m',   bw:15.37,bh:16.02,rows:[{x:178.11,yc:381.78,n:2}]},
  {type:'text',page:5,fd:'_s1PermitIssue_y',   bw:15.37,bh:16.02,rows:[{x:215.68,yc:381.78,n:4}]},
  {type:'text',page:5,fd:'_s1PermitExpiry_d',  bw:14.88,bh:16.02,rows:[{x:422.61,yc:381.85,n:2}]},
  {type:'text',page:5,fd:'_s1PermitExpiry_m',  bw:14.88,bh:16.02,rows:[{x:458.96,yc:381.78,n:2}]},
  {type:'text',page:5,fd:'_s1PermitExpiry_y',  bw:14.88,bh:16.02,rows:[{x:495.38,yc:381.78,n:4}]},
  {type:'tick',page:5,fd:'_otherResYes',match:'YES',x:209.61,y:350.47,bw:16.65,bh:17},
  {type:'tick',page:5,fd:'_otherResNo', match:'NO', x:249.74,y:350.47,bw:16.65,bh:17},
  {type:'text',page:5,fd:'s1OtherResCountry',  bw:175,bh:17,rows:[{x:376,yc:349.8,n:1}],fullText:true},
  {type:'text',page:5,fd:'s1ResidentPermit2',  bw:15.09,bh:17,   rows:[{x:144.99,yc:317.32,n:12}]},
  {type:'text',page:5,fd:'_s1PermitIssue2_d',  bw:15.37,bh:16.02,rows:[{x:145.45,yc:294.85,n:2}]},
  {type:'text',page:5,fd:'_s1PermitIssue2_m',  bw:15.37,bh:16.02,rows:[{x:182.95,yc:294.78,n:2}]},
  {type:'text',page:5,fd:'_s1PermitIssue2_y',  bw:15.37,bh:16.02,rows:[{x:220.52,yc:294.78,n:4}]},
  {type:'text',page:5,fd:'_s1PermitExpiry2_d', bw:15.37,bh:16.02,rows:[{x:418.36,yc:294.85,n:2}]},
  {type:'text',page:5,fd:'_s1PermitExpiry2_m', bw:15.37,bh:16.02,rows:[{x:455.86,yc:294.78,n:2}]},
  {type:'text',page:5,fd:'_s1PermitExpiry2_y', bw:15.37,bh:16.02,rows:[{x:493.43,yc:294.78,n:4}]},
  {type:'text',page:5,fd:'s1BVN',         bw:15.09,bh:17, rows:[{x:175.59,yc:261.27,n:13}]},
  {type:'text',page:5,fd:'s1ResHousePlot',bw:16.87,bh:17, rows:[{x:140.87,yc:218.02,n:5}]},
  {type:'text',page:5,fd:'s1ResStreet',   bw:14.40,bh:17, rows:[{x:296.91,yc:218.11,n:18}]},
  {type:'text',page:5,fd:'s1ResBusStop',  bw:15.49,bh:18.19,rows:[{x:184.43,yc:194.94,n:24}]},
  {type:'text',page:5,fd:'s1ResCity',     bw:15.09,bh:17, rows:[{x:92.22, yc:171.85,n:13}]},
  {type:'text',page:5,fd:'s1ResLGA',      bw:15.51,bh:17, rows:[{x:354.63,yc:171.85,n:13}]},
  {type:'text',page:5,fd:'s1ResState',    bw:15.09,bh:17, rows:[{x:76.89, yc:151.56,n:13}]},
  {type:'text',page:5,fd:'_s1MailAddr',   rows:[{x:230.92,yc:128.81,bw:15.49,bh:18.19,n:21},{x:115.13,yc:104.72,bw:16.84,bh:17,n:26}]},
  {type:'text',page:5,fd:'s1Mobile',      bw:15.52,bh:17, rows:[{x:123.80,yc:83.27,n:11}]},
  {type:'text',page:5,fd:'s1Phone',       bw:15.47,bh:17, rows:[{x:370.65,yc:83.27,n:13}]},
  {type:'text',page:5,fd:'s1Email',       bw:16.68,bh:17, rows:[{x:119.60,yc:62.98,n:26}]},

  // ── PAGE 6: Signatory 2 ────────────────────────────────────────────────────
  {type:'text',page:6,fd:'s2Surname',     bw:16.79,bh:17, rows:[{x:100.1,yc:646.9,n:27}]},
  {type:'text',page:6,fd:'s2FirstName',   bw:16.79,bh:17, rows:[{x:115.8,yc:626.0,n:26}]},
  {type:'text',page:6,fd:'s2OtherNames',  bw:13.39,bh:17, rows:[{x:268.4,yc:605.0,n:10}]},
  {type:'text',page:6,fd:'_s2DOB_d',      bw:15.37,bh:16.02,rows:[{x:185.0,yc:572.0,n:2}]},
  {type:'text',page:6,fd:'_s2DOB_m',      bw:15.37,bh:16.02,rows:[{x:215.8,yc:572.0,n:2}]},
  {type:'text',page:6,fd:'_s2DOB_y',      bw:15.37,bh:16.02,rows:[{x:246.6,yc:572.0,n:4}]},
  {type:'text',page:6,fd:'s2PlaceOfBirth',bw:16.57,bh:17, rows:[{x:340.7,yc:571.8,n:13}]},
  {type:'text',page:6,fd:'s2MothersName', bw:16.98,bh:17, rows:[{x:163.2,yc:543.2,n:23}]},
  {type:'text',page:6,fd:'s2LGAOrigin',   bw:15.6, bh:17, rows:[{x:118.4,yc:523.3,n:13}]},
  {type:'text',page:6,fd:'s2StateOrigin', bw:15.15,bh:17, rows:[{x:404.5,yc:523.3,n:10}]},
  {type:'text',page:6,fd:'s2TIN',         bw:16.57,bh:17, rows:[{x:150.5,yc:491.3,n:16}]},
  {type:'text',page:6,fd:'s2IDType',      bw:14.54,bh:17, rows:[{x:110.7,yc:456.4,n:12}]},
  {type:'text',page:6,fd:'s2IDNumber',    bw:15.92,bh:17, rows:[{x:365.6,yc:456.4,n:12}]},
  {type:'text',page:6,fd:'s2Occupation',  bw:16.6, bh:17, rows:[{x:204.3,yc:372.0,n:21}]},
  {type:'text',page:6,fd:'s2BVN',         bw:16.87,bh:17, rows:[{x:404.5,yc:241.3,n:9}]},
  {type:'text',page:6,fd:'s2ResHousePlot',bw:16.87,bh:17, rows:[{x:142.1,yc:196.7,n:5}]},
  {type:'text',page:6,fd:'s2ResStreet',   bw:14.4, bh:17, rows:[{x:297.1,yc:196.8,n:18}]},
  {type:'text',page:6,fd:'s2ResBusStop',  bw:15.49,bh:18.19,rows:[{x:184.6,yc:175.6,n:24}]},
  {type:'text',page:6,fd:'s2ResCity',     bw:15.09,bh:17, rows:[{x:98.1,yc:153.5,n:13}]},
  {type:'text',page:6,fd:'s2ResLGA',      bw:15.51,bh:17, rows:[{x:354.8,yc:153.5,n:13}]},
  {type:'text',page:6,fd:'s2ResState',    bw:15.09,bh:17, rows:[{x:98.1,yc:132.2,n:13}]},
  {type:'text',page:6,fd:'_s2MailAddr',   bw:15.49,bh:18.19,rows:[{x:230.8,yc:110.8,n:21},{x:115.4,yc:83.8,n:26}]},
  {type:'text',page:6,fd:'s2Mobile',      bw:15.84,bh:17, rows:[{x:136.2,yc:53.9,n:10}]},
  {type:'text',page:6,fd:'s2Phone',       bw:16.27,bh:17, rows:[{x:377.4,yc:53.9,n:11}]},
  {type:'text',page:6,fd:'s2Email',       bw:16.84,bh:17, rows:[{x:115.4,yc:33.6,n:26}]},

  // ── PAGE 7: Signatory 3 ────────────────────────────────────────────────────
  {type:'text',page:7,fd:'s3Surname',     bw:16.79,bh:17, rows:[{x:99.1,yc:626.0,n:27}]},
  {type:'text',page:7,fd:'s3FirstName',   bw:16.79,bh:17, rows:[{x:115.8,yc:604.2,n:26}]},
  {type:'text',page:7,fd:'s3OtherNames',  bw:13.39,bh:17, rows:[{x:269.5,yc:582.0,n:10}]},
  {type:'text',page:7,fd:'_s3DOB_d',      bw:15.37,bh:16.02,rows:[{x:187.4,yc:551.6,n:2}]},
  {type:'text',page:7,fd:'_s3DOB_m',      bw:15.37,bh:16.02,rows:[{x:218.2,yc:551.6,n:2}]},
  {type:'text',page:7,fd:'_s3DOB_y',      bw:15.37,bh:16.02,rows:[{x:249.0,yc:551.6,n:4}]},
  {type:'text',page:7,fd:'s3PlaceOfBirth',bw:16.57,bh:17, rows:[{x:340.7,yc:551.0,n:13}]},
  {type:'text',page:7,fd:'s3MothersName', bw:16.98,bh:17, rows:[{x:163.2,yc:521.2,n:23}]},
  {type:'text',page:7,fd:'s3LGAOrigin',   bw:15.6, bh:17, rows:[{x:118.4,yc:501.4,n:13}]},
  {type:'text',page:7,fd:'s3StateOrigin', bw:15.15,bh:17, rows:[{x:405.6,yc:501.4,n:10}]},
  {type:'text',page:7,fd:'s3TIN',         bw:16.57,bh:17, rows:[{x:150.4,yc:472.1,n:16}]},
  {type:'text',page:7,fd:'s3IDType',      bw:14.54,bh:17, rows:[{x:112.7,yc:435.2,n:12}]},
  {type:'text',page:7,fd:'s3IDNumber',    bw:15.92,bh:17, rows:[{x:366.6,yc:435.2,n:12}]},
  {type:'text',page:7,fd:'s3Occupation',  bw:16.6, bh:17, rows:[{x:205.3,yc:351.8,n:21}]},
  {type:'text',page:7,fd:'s3BVN',         bw:16.87,bh:17, rows:[{x:405.5,yc:218.9,n:9}]},
  {type:'text',page:7,fd:'s3ResHousePlot',bw:16.87,bh:17, rows:[{x:142.5,yc:175.4,n:5}]},
  {type:'text',page:7,fd:'s3ResStreet',   bw:14.4, bh:17, rows:[{x:296.5,yc:175.6,n:18}]},
  {type:'text',page:7,fd:'s3ResBusStop',  bw:15.49,bh:18.19,rows:[{x:184.0,yc:153.3,n:24}]},
  {type:'text',page:7,fd:'s3ResCity',     bw:15.09,bh:17, rows:[{x:94.5,yc:130.3,n:13}]},
  {type:'text',page:7,fd:'s3ResLGA',      bw:15.51,bh:17, rows:[{x:354.2,yc:130.3,n:13}]},
  {type:'text',page:7,fd:'s3ResState',    bw:15.09,bh:17, rows:[{x:94.5,yc:109.0,n:13}]},
  {type:'text',page:7,fd:'_s3MailAddr',   bw:15.49,bh:18.19,rows:[{x:231.1,yc:87.4,n:21},{x:115.6,yc:61.4,n:26}]},
  {type:'text',page:7,fd:'s3Mobile',      bw:15.84,bh:17, rows:[{x:120.1,yc:40.7,n:11}]},
  {type:'text',page:7,fd:'s3Phone',       bw:16.27,bh:17, rows:[{x:377.1,yc:40.7,n:11}]},

  // ── PAGE 8: Sig3 email + Next of Kin ────────────────────────────────────────
  {type:'text',page:8,fd:'s3Email',       bw:16.84,bh:17, rows:[{x:115.1,yc:813.5,n:26}]},
  {type:'text',page:8,fd:'nokSurname',    bw:16.79,bh:17, rows:[{x:99.8,yc:615.6,n:27}]},
  {type:'text',page:8,fd:'nokFirstName',  bw:16.79,bh:17, rows:[{x:132.5,yc:592.7,n:25}]},
  {type:'text',page:8,fd:'nokOtherNames', bw:15.37,bh:16.02,rows:[{x:207.3,yc:569.6,n:4}]},
  {type:'text',page:8,fd:'_nokDOB_dmy',   bw:17.08,bh:17.29,rows:[{x:109.5,yc:537.6,n:26}]},
  {type:'text',page:8,fd:'nokHousePlot',  bw:16.79,bh:17, rows:[{x:143.7,yc:494.2,n:5}]},
  {type:'text',page:8,fd:'nokStreet',     bw:16.69,bh:17, rows:[{x:306.9,yc:494.3,n:15}]},
  {type:'text',page:8,fd:'nokBusStop',    bw:16.47,bh:17, rows:[{x:175.5,yc:471.7,n:23}]},
  {type:'text',page:8,fd:'nokCity',       bw:15.09,bh:17, rows:[{x:95.7,yc:449.0,n:13}]},
  {type:'text',page:8,fd:'nokLGA',        bw:15.09,bh:17, rows:[{x:361.1,yc:449.0,n:13}]},
  {type:'text',page:8,fd:'nokState',      bw:15.09,bh:17, rows:[{x:95.3,yc:428.3,n:13}]},
  {type:'text',page:8,fd:'_nokMailAddr',  bw:16.18,bh:17, rows:[{x:214.9,yc:406.0,n:21},{x:132.2,yc:379.2,n:25}]},
  {type:'text',page:8,fd:'nokMobile',     bw:15.84,bh:17, rows:[{x:122.0,yc:360.3,n:11}]},
  {type:'text',page:8,fd:'nokPhone',      bw:16.27,bh:17, rows:[{x:379.0,yc:360.3,n:11}]},
  {type:'text',page:8,fd:'nokEmail',      bw:16.82,bh:17.3,rows:[{x:116.7,yc:337.8,n:26}]},

  // ── PAGE 10: Mandate signatories ──────────────────────────────────────────
  {type:'text',page:10,fd:'_ms1Surname',  bw:16.27,bh:17, rows:[{x:97.5,yc:689.6,n:20}]},
  {type:'text',page:10,fd:'_ms1First',    bw:16.27,bh:17, rows:[{x:114.3,yc:669.4,n:19}]},
  {type:'text',page:10,fd:'_ms1Other',    bw:16.03,bh:17, rows:[{x:136.1,yc:649.2,n:26}]},
  {type:'text',page:10,fd:'_ms2Surname',  bw:16.27,bh:17, rows:[{x:97.5,yc:504.2,n:20}]},
  {type:'text',page:10,fd:'_ms2First',    bw:16.27,bh:17, rows:[{x:114.3,yc:483.0,n:19}]},
  {type:'text',page:10,fd:'_ms2Other',    bw:16.03,bh:17, rows:[{x:136.1,yc:461.8,n:26}]},
  {type:'text',page:10,fd:'_ms3Surname',  bw:16.27,bh:17, rows:[{x:97.0,yc:317.3,n:20}]},
  {type:'text',page:10,fd:'_ms3First',    bw:16.27,bh:17, rows:[{x:113.8,yc:297.6,n:19}]},
  {type:'text',page:10,fd:'_ms3Other',    bw:16.03,bh:17, rows:[{x:135.7,yc:275.8,n:26}]},
];

// ── BUILD STAMP DATA ──────────────────────────────────────────────────────────
function buildStampData(){
  const d=Object.assign({},FD);
  const addrParts=[d.bizHousePlot,d.bizAddr1,d.bizBusStop,d.bizCity,d.bizLGA,d.bizState].filter(Boolean).map(x=>x.toUpperCase());
  const addrDeduped=addrParts.filter((v,i)=>i===0||v!==addrParts[i-1]);
  d._bizAddr1full=addrDeduped.join(' ');
  d._bizAddr2full='';
  d._bizRegAddr= d.sameAsOpAddr==='YES' ? 'SAME AS OPERATING ADDRESS'
               : d.sameAsOpAddr==='NO'  ? (d.bizRegAddress||'').toUpperCase()
               : '';
  function splitDate(val,df,mf,yf){
    if(!val) return;
    const p=val.replace(/[^0-9-]/g,'').split('-');
    if(p.length===3){d[df]=p[2]||'';d[mf]=p[1]||'';d[yf]=p[0]||'';}
  }
  splitDate(d.bizRegDate,'_bizRegDate_d','_bizRegDate_m','_bizRegDate_y');
  splitDate(d.s1DOB,'_s1DOB_d','_s1DOB_m','_s1DOB_y');
  const idNeedsDates=['DRIVER\'S LICENCE','INTERNATIONAL PASSPORT'].includes((d.s1IDType||'').toUpperCase());
  if(idNeedsDates){
    splitDate(d.s1IDIssue,'_s1IDIssue_d','_s1IDIssue_m','_s1IDIssue_y');
    splitDate(d.s1IDExpiry,'_s1IDExpiry_d','_s1IDExpiry_m','_s1IDExpiry_y');
  }
  const idMap={'NATIONAL ID (NIN)':'NIN','DRIVER\'S LICENCE':'DRV LICENCE','INTERNATIONAL PASSPORT':'INTL PASSPORT','VOTER\'S CARD':'VOTERS CARD'};
  d.s1IDType=idMap[(d.s1IDType||'').toUpperCase()]||(d.s1IDType||'');
  const natVal=(d.s1Nationality||'').toUpperCase();
  d._natNigerian=natVal==='NIGERIAN'?'NIGERIAN':'';
  d._natOthers  =natVal==='OTHER'   ?'OTHER'   :'';
  if(natVal!=='OTHER') d.s1NationalityCountry='';
  if(natVal==='OTHER'){
    splitDate(d.s1PermitIssue, '_s1PermitIssue_d','_s1PermitIssue_m','_s1PermitIssue_y');
    splitDate(d.s1PermitExpiry,'_s1PermitExpiry_d','_s1PermitExpiry_m','_s1PermitExpiry_y');
  } else { d.s1ResidentPermit=''; }
  const otherRes=(d.s1OtherResidency||'').toUpperCase();
  d._otherResYes=otherRes==='YES'?'YES':'';
  d._otherResNo =otherRes==='NO' ?'NO' :'';
  if(otherRes==='YES'){
    splitDate(d.s1PermitIssue2, '_s1PermitIssue2_d','_s1PermitIssue2_m','_s1PermitIssue2_y');
    splitDate(d.s1PermitExpiry2,'_s1PermitExpiry2_d','_s1PermitExpiry2_m','_s1PermitExpiry2_y');
  } else { d.s1OtherResCountry=''; d.s1ResidentPermit2=''; }
  // S2 computed fields
  splitDate(d.s2DOB,'_s2DOB_d','_s2DOB_m','_s2DOB_y');
  const nat2Val=(d.s2Nationality||'').toUpperCase();
  d._nat2Nigerian=nat2Val==='NIGERIAN'?'NIGERIAN':'';
  d._nat2Others  =nat2Val==='OTHER'   ?'OTHER'   :'';
  if(nat2Val!=='OTHER') d.s2NationalityCountry='';
  if(nat2Val==='OTHER'){
    splitDate(d.s2PermitIssue, '_s2PermitIssue_d','_s2PermitIssue_m','_s2PermitIssue_y');
    splitDate(d.s2PermitExpiry,'_s2PermitExpiry_d','_s2PermitExpiry_m','_s2PermitExpiry_y');
  } else { d.s2ResidentPermit=''; }
  const idMap2={'NATIONAL ID (NIN)':'NIN','DRIVER\'S LICENCE':'DRV LICENCE','INTERNATIONAL PASSPORT':'INTL PASSPORT','VOTER\'S CARD':'VOTERS CARD'};
  d.s2IDType=idMap2[(d.s2IDType||'').toUpperCase()]||(d.s2IDType||'');
  const id2NeedsDates=['DRV LICENCE','INTL PASSPORT'].includes(d.s2IDType);
  if(id2NeedsDates){
    splitDate(d.s2IDIssue,'_s2IDIssue_d','_s2IDIssue_m','_s2IDIssue_y');
    splitDate(d.s2IDExpiry,'_s2IDExpiry_d','_s2IDExpiry_m','_s2IDExpiry_y');
  }
  // S3
  splitDate(d.s3DOB,'_s3DOB_d','_s3DOB_m','_s3DOB_y');
  // NOK
  d._nokNameFull=[d.nokFirstName,d.nokSurname].filter(Boolean).join(' ').toUpperCase();
  if(d.nokDOB){ const p=d.nokDOB.split('-'); d._nokDOB_dmy=p.length===3?(p[2]+p[1]+p[0]):''; } else { d._nokDOB_dmy=''; }
  d._nokMailAddr=[d.nokHousePlot,d.nokStreet,d.nokBusStop].filter(Boolean).join(' ').toUpperCase();
  // Signatory mailing addresses
  d._s1MailAddr= d.s1SameMailAddr==='NO'
    ? [d.s1MailHouse,d.s1MailStreet,d.s1MailCity,d.s1MailState].filter(Boolean).join(' ').toUpperCase()
    : [d.s1ResHousePlot,d.s1ResStreet,d.s1ResBusStop,d.s1ResCity].filter(Boolean).join(' ').toUpperCase();
  d._s2MailAddr=[d.s2ResHousePlot||'',d.s2ResStreet||'',d.s2ResBusStop||''].filter(Boolean).join(' ').toUpperCase();
  d._s3MailAddr=[d.s3ResHousePlot||'',d.s3ResStreet||'',d.s3ResBusStop||''].filter(Boolean).join(' ').toUpperCase();
  // Account type tick
  const prodId=d.bizAccountProduct||'';
  if(prodId){
    d._acctTypeTick= prodId==='current'||prodId==='gtbusiness'||prodId==='gtbiz_premium' ? 'C' :
                     prodId==='gtmax' ? 'O' : 'C';
  }
  // Domiciliary currency flags
  const domiStr=(d.domiCurrencies||'').toLowerCase();
  d._domiUSD=/usd|\$/.test(domiStr)?'USD':'';
  d._domiEUR=/eur|€/.test(domiStr)?'EUR':'';
  d._domiJPY=/jpy|¥/.test(domiStr)?'JPY':'';
  d._domiGBP=/gbp|£/.test(domiStr)?'GBP':'';
  // Mandate signatories
  d._ms1Surname=(d.s1Surname||'').toUpperCase();
  d._ms1First=(d.s1FirstName||'').toUpperCase();
  d._ms1Other=(d.s1OtherNames||'').toUpperCase();
  d._ms2Surname=(d.s2Surname||'').toUpperCase();
  d._ms2First=(d.s2FirstName||'').toUpperCase();
  d._ms2Other=(d.s2OtherNames||'').toUpperCase();
  d._ms3Surname=(d.s3Surname||'').toUpperCase();
  d._ms3First=(d.s3FirstName||'').toUpperCase();
  d._ms3Other=(d.s3OtherNames||'').toUpperCase();
  // TIN split
  if(d.bizTIN){
    const tin=d.bizTIN.replace(/\D/g,'');
    d.bizTIN=tin.substring(0,8);
    d._bizTINoverflow=tin.length>8?tin.substring(8):'';
  }
  // SCUML
  if(d.bizSCUML){
    let s=d.bizSCUML.replace(/\s+/g,'').toUpperCase();
    if(!s.startsWith('SC')) s='SC'+s;
    d.bizSCUML=s;
  }
  Object.keys(d).forEach(k=>{ if(typeof d[k]==='string') d[k]=d[k].toUpperCase(); });
  return d;
}

// ── PDF PREVIEW CONFIG ────────────────────────────────────────────────────────
const PDF_URL = 'pdfs/Account-Opening-Documentation-Sole-Proprietorship-Partnership-Form-Jan-2026.pdf';
const PAGE_LABELS = {
  1:'Page 1 — Cover', 2:'Page 2 — Instructions',
  3:'Page 3 — Entity Details', 4:'Page 4 — Account Services',
  5:'Page 5 — Signatory 1', 6:'Page 6 — Signatory 2',
  7:'Page 7 — Signatory 3', 8:'Page 8 — Next of Kin',
  9:'Page 9 — Authority to Debit', 10:'Page 10 — Mandate',
  11:'Page 11',12:'Page 12',13:'Page 13',14:'Page 14',15:'Page 15',
  16:'Page 16 — Privacy & Declaration',17:'Page 17',18:'Page 18',19:'Page 19',20:'Page 20',
};
const PDF_TOTAL_PAGES = 20;

const SLIDE_PAGE_MAP = {
  0:3,
  1:3,2:3,3:4,4:4,
  5:3,6:3,7:3,
  8:3,9:3,10:3,11:3,
  12:5,13:5,14:5,
  15:5,16:5,
  17:5,18:5,19:5,
  20:5,21:5,22:5,
  23:5,
  24:8,25:8,26:8,
  27:10,
  // S2 slides
  28:6,29:6,30:6,31:6,32:6,33:6,34:6,35:6,36:6,37:6,38:6,39:6,
  // Services, terms, docs
  40:4,41:4,42:4,43:4,
  44:16,
  45:3,46:3,47:3,48:3,
  49:3,50:3,51:3,
};
