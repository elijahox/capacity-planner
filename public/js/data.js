// ================================================================
// DATA — squads, initiatives, people, constants
// ================================================================

const TRIBES = [
  { id:'web',    name:'Web',             color:'#1a5276' },
  { id:'range',  name:'Range',           color:'#1e8449' },
  { id:'app',    name:'App',             color:'#6c3483' },
  { id:'cp',     name:'Customer Platform', color:'#c17f24' },
];

let squads = [
  {id:'checkout',  tribe:'web',   name:'Checkout',            size:10},
  {id:'payments',  tribe:'web',   name:'Payments',            size:9},
  {id:'discover',  tribe:'web',   name:'Discover & Manage',   size:8},
  {id:'mktplace',  tribe:'range', name:'Marketplace',         size:10},
  {id:'fandc',     tribe:'range', name:'F&C',                 size:10},
  {id:'chatbot',   tribe:'range', name:'Chatbot',             size:7},
  {id:'persloy',   tribe:'range', name:'Pers/Loyalty',        size:7},
  {id:'rocket',    tribe:'range', name:'Rocket',              size:6},
  {id:'ppngcx',    tribe:'app',   name:'PPNG (CX)',           size:8},
  {id:'ppngint',   tribe:'app',   name:'PPNG (Integrations)', size:9},
  {id:'ppinstore', tribe:'app',   name:'PowerPass In-store',  size:5},
  {id:'ppecom',    tribe:'app',   name:'PowerPass eComm',     size:8},
  {id:'findplan',  tribe:'app',   name:'Find & Plan',         size:7},
  {id:'buyman',    tribe:'app',   name:'Buy & Manage',        size:6},
  {id:'sfcrm',     tribe:'cp',    name:'Salesforce CRM',      size:9},
  {id:'ppng_cp',   tribe:'cp',    name:'PPNG',                size:5},
  {id:'nzloy_cp',  tribe:'cp',    name:'NZ Loyalty',          size:5},
  {id:'core_crm',  tribe:'cp',    name:'Core CRM',            size:0},
  {id:'ppng_cp2',  tribe:'cp',    name:'PPNG',                size:0},
];

let initiatives = [
  {id:'ppng',      name:'PPNG',                     tier:1, status:'Delivery',      owner:'C&S', allocations:{ppngcx:100,ppngint:100,ppecom:30,ppinstore:5}, budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:'C&S', pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'rocket_i',  name:'Project Rocket',            tier:1, status:'Delivery',      owner:'C&S', allocations:{fandc:10,persloy:10,chatbot:100,rocket:100},   budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:'C&S', pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'nzmkt',     name:'NZ Marketplace',            tier:2, status:'Delivery',      owner:'C&S', allocations:{mktplace:90},                                  budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:'C&S', pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'nzloy',     name:'NZ Loyalty',                tier:2, status:'Delivery',      owner:'C&S', allocations:{persloy:10,nzloy_cp:80},                       budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:'C&S', pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'tyrewise',  name:'TyreWise',                  tier:2, status:'Delivery',      owner:'C&S', allocations:{checkout:30},                                  budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:'C&S', pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'uteboot',   name:'Ute & Boot Delivery',       tier:2, status:'Delivery',      owner:'C&S', allocations:{checkout:25},                                  budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:'C&S', pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'ocean',     name:'Project Ocean',             tier:2, status:'Delivery',      owner:'C&S', allocations:{fandc:15,mktplace:10,payments:10,ppngint:10},  budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:'C&S', pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'stripe',    name:'Stripe',                    tier:2, status:'Business Case', owner:'C&S', allocations:{payments:20},                                  budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:'C&S', pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'redsba',    name:'Reds in BA',                tier:2, status:'Delivery',      owner:'C&S', allocations:{findplan:20},                                  budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:null,  pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'ppecom_i',  name:'PP Ecom',                   tier:2, status:'Delivery',      owner:'C&S', allocations:{ppecom:100},                                   budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:'C&S', pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'retailmfa', name:'Retail MFA',                tier:2, status:'Delivery',      owner:'C&S', allocations:{payments:20},                                  budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:'C&S', pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'sfcrm_i',   name:'Salesforce CRM',            tier:2, status:'Delivery',      owner:'C&S', allocations:{sfcrm:90},                                     budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:'C&S', pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'futsch',    name:'Future of Search',          tier:3, status:'Delivery',      owner:null,  allocations:{fandc:40,mktplace:5},                          budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:null,  pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'loyback',   name:'Loyalty Backlog',           tier:3, status:'Delivery',      owner:null,  allocations:{persloy:100},                                  budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:null,  pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'incident',  name:'Incident Management',       tier:3, status:'Delivery',      owner:null,  allocations:{fandc:5,mktplace:10,chatbot:10,ppinstore:30,findplan:70}, budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:null, pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'apigee',    name:'APIGEE X Migration',        tier:3, status:'Delivery',      owner:null,  allocations:{fandc:20,mktplace:10,checkout:7,payments:45,discover:35,findplan:50}, budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:null, pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'futcart',   name:'Future of Cart',            tier:3, status:'Delivery',      owner:null,  allocations:{checkout:20},                                  budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:null,  pipelineStatus:'in_delivery', estimates:[], assignments:[]},
  {id:'crt',       name:'Core Retail Transformation',tier:1, status:'Assess',        owner:null,  allocations:{},                                             budget:null, estimatedCapacity:{}, estimatedHeadcount:null, expectedStart:null, expectedDuration:null, sponsor:null,  pipelineStatus:'in_delivery', estimates:[], assignments:[]},
];

// People register — each person has a squadId and type
// type: 'perm' | 'contractor' | 'msp'
let people = [
  // --- WEB / Checkout ---
  {id:'p1',  name:'Jackie Leslie',       squad:'checkout', secondarySquad:null, role:'Delivery Lead',   type:'perm',       dayRate:null,  agency:null,       startDate:'2023-01-10', endDate:null,       status:'active', nextAction:null,   actionStatus:null,   comments:''},
  {id:'p2',  name:'Chris Weall',         squad:'checkout', secondarySquad:null, role:'Delivery Lead',   type:'perm',       dayRate:null,  agency:null,       startDate:'2022-05-01', endDate:null,       status:'active', nextAction:null,   actionStatus:null,   comments:''},
  {id:'p3',  name:'Nick Nguyen',         squad:'checkout', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1250,  agency:'NCS',      startDate:'2025-03-12', endDate:'2026-03-12', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:'Extension approved til 30th Jun'},
  {id:'p4',  name:'Ian Babic',           squad:'checkout', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1208,  agency:'AKQA',     startDate:'2024-11-25', endDate:'2026-03-26', status:'active', nextAction:'Roll Off', actionStatus:'Approved', comments:'Changed into a perm TM'},
  {id:'p5',  name:'Berik Assyibekov',    squad:'checkout', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1250,  agency:'Iterate',  startDate:'2025-01-09', endDate:'2026-06-30', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:''},
  // --- WEB / Payments ---
  {id:'p6',  name:'Fares Isskander',     squad:'payments', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1250,  agency:'NCS',      startDate:'2024-04-17', endDate:'2026-04-30', status:'active', nextAction:'Extend', actionStatus:null,   comments:''},
  {id:'p7',  name:'Paolo Benini',        squad:'payments', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1250,  agency:'NCS',      startDate:'2024-04-24', endDate:'2026-04-30', status:'active', nextAction:'Extend', actionStatus:null,   comments:''},
  {id:'p8',  name:'Aditi Thakkar',       squad:'payments', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1250,  agency:'NCS',      startDate:'2025-03-06', endDate:'2026-04-30', status:'active', nextAction:'Extend', actionStatus:null,   comments:''},
  // --- RANGE / Rocket ---
  {id:'p9',  name:'Michael Dixon',       squad:'rocket', secondarySquad:null, role:'Engineer',        type:'contractor', dayRate:1200,  agency:'Iterate',  startDate:'2025-02-04', endDate:'2026-08-28', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:'Extension approved til 31st Aug'},
  {id:'p10', name:'Mazhar Morshed',      squad:'rocket', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1200,  agency:'RW',       startDate:'2025-01-13', endDate:'2026-08-28', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:'Contract extended til end Aug 2026'},
  {id:'p11', name:'Dylan McLeod',        squad:'rocket', secondarySquad:null, role:'Tech Lead',       type:'contractor', dayRate:1290,  agency:'Iterate',  startDate:'2025-05-26', endDate:'2026-04-30', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:'Extension approved til 31st Aug'},
  {id:'p12', name:'Jorge Betancur',      squad:'rocket', secondarySquad:null, role:'Delivery Lead',   type:'contractor', dayRate:1255,  agency:'RW',       startDate:'2025-03-24', endDate:'2026-08-28', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:'Extension approved til 31st Aug'},
  {id:'p13', name:'Ben Shipera',         squad:'rocket', secondarySquad:null, role:'Business Analyst',type:'contractor', dayRate:1073,  agency:'Preacta',  startDate:'2025-02-04', endDate:'2026-08-28', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:'Extension approved til 31st Aug'},
  {id:'p14', name:'Joseph Jeganathan',   squad:'rocket', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1200,  agency:'Iterate',  startDate:'2025-07-28', endDate:'2026-08-28', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:'Extension approved til 31st Aug'},
  {id:'p15', name:'Ramkumar Ranganathan',squad:'rocket', secondarySquad:null, role:'Quality Engineer',type:'contractor', dayRate:1150,  agency:'Iterate',  startDate:'2025-07-28', endDate:'2026-08-28', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:''},
  // --- APP / PPNG ---
  {id:'p16', name:'Guramarjit Singh',    squad:'ppngcx', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1200,  agency:'AKQA',     startDate:'2021-07-21', endDate:'2026-06-30', status:'active', nextAction:'Roll Off', actionStatus:null,  comments:'Roll off after 30th June'},
  {id:'p17', name:'Balan Sinniah',       squad:'ppng_cp', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1200,  agency:'NSG',      startDate:'2025-06-01', endDate:'2026-06-30', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:'Extension approved til 30th June'},
  {id:'p18', name:'Karol Koziel',        squad:'ppng_cp', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1292,  agency:'NSG',      startDate:'2025-07-04', endDate:'2026-06-30', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:'Extension approved til 30th June'},
  {id:'p19', name:'Pushpraj Samant',     squad:'ppngcx', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1180,  agency:'NSG',      startDate:'2025-04-14', endDate:'2026-06-30', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:'Extension approved til 30th June'},
  {id:'p20', name:'Dylan Shaw',          squad:'ppngint', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1208,  agency:'AKQA',     startDate:'2025-09-09', endDate:'2026-06-30', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:'Extension approved til 30th June'},
  // --- APP / PowerPass ---
  {id:'p21', name:'Josh Kriesl',         squad:'ppecom', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1250,  agency:'NCS',      startDate:'2025-04-25', endDate:'2026-04-30', status:'active', nextAction:'Extend', actionStatus:null,   comments:''},
  {id:'p22', name:'Ray Lewandowski',     squad:'ppecom', secondarySquad:null, role:'Senior Engineer', type:'msp',        dayRate:1208,  agency:'AKQA',     startDate:'2025-01-07', endDate:'2026-04-30', status:'active', nextAction:'Extend', actionStatus:'Awaiting Approval', comments:''},
  // --- RANGE / Loyalty ---
  {id:'p23', name:'Khalid Elshafie',     squad:'persloy', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1250,  agency:'Iterate',  startDate:'2025-02-26', endDate:'2026-06-30', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:''},
  {id:'p24', name:'Armen Avanesi',       squad:'persloy', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1200,  agency:'NSG',      startDate:'2026-01-13', endDate:'2026-06-30', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:''},
  {id:'p25', name:'Dinuka Jayamuni',     squad:'persloy', secondarySquad:null, role:'Tech Lead',       type:'contractor', dayRate:1350,  agency:'Iterate',  startDate:'2025-11-13', endDate:'2026-06-30', status:'active', nextAction:'Extend', actionStatus:'Approved', comments:''},
  // --- CUST PLATFORM / SF ---
  {id:'p26', name:'Brian Lee',           squad:'sfcrm', secondarySquad:null, role:'Senior Engineer', type:'msp',        dayRate:1200,  agency:'Deloitte', startDate:'2025-10-11', endDate:'2026-04-25', status:'active', nextAction:null,   actionStatus:null,   comments:''},
  {id:'p27', name:'Thomas Clayton',      squad:'sfcrm', secondarySquad:null, role:'Senior Engineer', type:'msp',        dayRate:1200,  agency:'Deloitte', startDate:'2025-01-12', endDate:'2026-04-25', status:'active', nextAction:null,   actionStatus:null,   comments:''},
  {id:'p28', name:'Yilu Shen',           squad:'sfcrm', secondarySquad:null, role:'Senior Engineer', type:'msp',        dayRate:1200,  agency:'Deloitte', startDate:'2025-08-01', endDate:'2026-04-25', status:'active', nextAction:null,   actionStatus:null,   comments:''},
  // --- RANGE / Ocean ---
  {id:'p29', name:'Philip Kolar',        squad:'mktplace', secondarySquad:null, role:'Senior Engineer', type:'contractor', dayRate:1250,  agency:'Iterate',  startDate:'2025-03-10', endDate:'2026-06-26', status:'active', nextAction:'New Hire', actionStatus:'Approved', comments:'Re-hire Phil'},
  // --- APP / Find & Plan ---
  {id:'p30', name:'Nikhil Kawatra',      squad:'findplan', secondarySquad:null, role:'Tech Lead',       type:'msp',        dayRate:1200,  agency:'AKQA',     startDate:'2025-11-13', endDate:'2026-03-30', status:'active', nextAction:'Extend', actionStatus:null,   comments:''},
  {id:'p31', name:'Dinesh Shafi',        squad:'fandc', secondarySquad:null, role:'Quality Engineer',type:'msp',        dayRate:1200,  agency:'AKQA',     startDate:'2025-03-04', endDate:'2026-06-30', status:'active', nextAction:'Extend', actionStatus:null,   comments:''},
  // --- PERMANENT STAFF ---
  // WEB / Checkout
  {id:'p100', name:'Carina Ware',        squad:'checkout', secondarySquad:null, role:'Senior Manager Product',      type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p101', name:'Demi Li',            squad:'checkout', secondarySquad:null, role:'Senior Product Manager',      type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p102', name:"Melanie D'Agostino", squad:'checkout', secondarySquad:null, role:'Product Design Lead',         type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p103', name:'Joey Graham',        squad:'checkout', secondarySquad:null, role:'Principal Product Designer',  type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p104', name:'Georgia Bruce',      squad:'checkout', secondarySquad:null, role:'Senior Product Designer',     type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p105', name:'Tracey Donald',      squad:'checkout', secondarySquad:null, role:'Design Researcher',           type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p106', name:'Simon Tran',         squad:'checkout', secondarySquad:null, role:'Lead Business Analyst',       type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p107', name:'Antar Kellerman',    squad:'checkout', secondarySquad:null, role:'Associate BA',                type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p108', name:'Jason Stubbs',       squad:'checkout', secondarySquad:null, role:'Engineering Manager',         type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p109', name:'Jay Liu',            squad:'checkout', secondarySquad:null, role:'Tech Lead',                   type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p110', name:'Deepa Malhotra',     squad:'checkout', secondarySquad:null, role:'Senior Manager Delivery',     type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p111', name:'Romy Igbal',         squad:'checkout', secondarySquad:null, role:'Delivery Lead',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  // WEB / Payments
  {id:'p112', name:'Tiana Said',         squad:'payments', secondarySquad:null, role:'Product Manager',             type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p113', name:'Tanya Hopmann',      squad:'payments', secondarySquad:null, role:'Business Analyst',            type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p114', name:'Idhaan Mehta',       squad:'payments', secondarySquad:null, role:'Tech Lead',                   type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p115', name:'Halina Tang',        squad:'payments', secondarySquad:null, role:'Tech Lead',                   type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p116', name:'Kelly Murphy',       squad:'payments', secondarySquad:null, role:'Delivery Lead',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  // WEB / Discover & Manage
  {id:'p117', name:'Ashok Singh',        squad:'discover', secondarySquad:null, role:'Lead Engineer',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  // RANGE / Marketplace
  {id:'p118', name:'Sam Wellington',     squad:'mktplace', secondarySquad:null, role:'Senior Manager Product',      type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p119', name:'Harry Hause',        squad:'mktplace', secondarySquad:null, role:'Product Manager',             type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p120', name:'Luke Stroud',        squad:'mktplace', secondarySquad:null, role:'Product Design Lead',         type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p121', name:'Janine Liston',      squad:'mktplace', secondarySquad:null, role:'Senior Product Designer',     type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p122', name:'Oscar Lee-Archer',   squad:'mktplace', secondarySquad:null, role:'Product Designer',            type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p123', name:'Bec Gerrard',        squad:'mktplace', secondarySquad:null, role:'Design Researcher',           type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p124', name:'Anita Da Mina',      squad:'mktplace', secondarySquad:null, role:'Lead Business Analyst',       type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p125', name:'Ashnik Banga',       squad:'mktplace', secondarySquad:null, role:'Engineering Manager',         type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p126', name:'Rahul Agarwal',      squad:'mktplace', secondarySquad:null, role:'Tech Lead',                   type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p127', name:'Palma Guthrie',      squad:'mktplace', secondarySquad:null, role:'Senior Manager Delivery',     type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p128', name:'Tim Wilkes',         squad:'mktplace', secondarySquad:null, role:'Delivery Manager',            type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p129', name:'Lincoln Lo',         squad:'mktplace', secondarySquad:null, role:'Lead Engineer',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  // RANGE / F&C
  {id:'p130', name:'Katie Cop',          squad:'fandc', secondarySquad:null, role:'Business Analyst',            type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p131', name:'Miso Ang',           squad:'fandc', secondarySquad:null, role:'Tech Lead',                   type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  // RANGE / Pers/Loyalty
  {id:'p132', name:'Tina Monaco',        squad:'persloy', secondarySquad:null, role:'Senior Product Manager',      type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p133', name:'Katie Shaw',         squad:'persloy', secondarySquad:null, role:'Product Manager',             type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  // RANGE / Rocket
  {id:'p134', name:'Tony Archibald',     squad:'rocket', secondarySquad:null, role:'Senior Product Manager',      type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  // APP / PPNG (CX)
  {id:'p135', name:'Raymond Smit',       squad:'ppngcx', secondarySquad:null, role:'Senior Manager Product',      type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p136', name:'Anna Babic',         squad:'ppngcx', secondarySquad:null, role:'Product Manager',             type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p137', name:'Philip Taylor',      squad:'ppngcx', secondarySquad:null, role:'Product Design Lead',         type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p138', name:'Billy Leung',        squad:'ppngcx', secondarySquad:null, role:'Senior Product Designer',     type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p139', name:'Gauri Tikhakar',     squad:'ppngcx', secondarySquad:null, role:'Business Analyst',            type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p140', name:'Sanaz Asani',        squad:'ppngcx', secondarySquad:null, role:'Business Analyst',            type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p141', name:'Jack Burns',         squad:'ppngcx', secondarySquad:null, role:'Engineering Manager',         type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p142', name:'Sona Lazar',         squad:'ppngcx', secondarySquad:null, role:'Tech Lead',                   type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p143', name:'Simon Rapaport',     squad:'ppngcx', secondarySquad:null, role:'Senior Manager Delivery',     type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p144', name:'Sharmila Chandra',   squad:'ppngcx', secondarySquad:null, role:'Delivery Manager',            type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p145', name:'Samira Devi',        squad:'ppngcx', secondarySquad:null, role:'Delivery Lead',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p146', name:'Jacob T Lewis',      squad:'ppngcx', secondarySquad:null, role:'Lead Engineer',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p147', name:'Eric Pham',          squad:'ppngcx', secondarySquad:null, role:'Engineer (BE)',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p148', name:'Camelo Fernandez',   squad:'ppngcx', secondarySquad:null, role:'Senior Engineer (BE)',        type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p149', name:'Qigang Cheng',       squad:'ppngcx', secondarySquad:null, role:'Engineer',                    type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  // APP / PPNG (Integrations)
  {id:'p150', name:'Lucy Pedmun',        squad:'ppngint', secondarySquad:null, role:'Product Manager',             type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p151', name:'Josh Peppiari',      squad:'ppngint', secondarySquad:null, role:'Senior Product Manager',      type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p152', name:'Kamrul Islam',       squad:'ppngint', secondarySquad:null, role:'Tech Lead',                   type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p153', name:'Brian Liu',          squad:'ppngint', secondarySquad:null, role:'Acting Tech Lead',            type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p154', name:'Jeremiah Blais',     squad:'ppngint', secondarySquad:null, role:'Delivery Manager',            type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p155', name:'Scham Boliaye',      squad:'ppngint', secondarySquad:null, role:'Delivery Lead',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p156', name:'Rahman Mamun',       squad:'ppngint', secondarySquad:null, role:'Lead Engineer',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p157', name:'Raelenne Okame',     squad:'ppngint', secondarySquad:null, role:'Engineer (BE)',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p158', name:'Aurelie Zhang',      squad:'ppngint', secondarySquad:null, role:'Senior Engineer',             type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p159', name:'Mohammed Imran',     squad:'ppngint', secondarySquad:null, role:'Platform Engineer',           type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  // APP / PowerPass In-store
  {id:'p160', name:'Jamie Leong',        squad:'ppinstore', secondarySquad:null, role:'Senior Product Manager',      type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  // APP / PowerPass eComm
  {id:'p161', name:'Jark Mawhoompharn', squad:'ppecom', secondarySquad:null, role:'Product Manager',             type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p162', name:'Katrina Nikiitna',   squad:'ppecom', secondarySquad:null, role:'Principal Product Designer',  type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p163', name:'Edward Jonas',       squad:'ppecom', secondarySquad:null, role:'Tech Lead',                   type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p164', name:'Gnady Aditya',       squad:'ppecom', secondarySquad:null, role:'Senior Engineer (BE)',        type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p165', name:'Lahul Kanakandy',    squad:'ppecom', secondarySquad:null, role:'Senior Engineer',             type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  // APP / Find & Plan
  {id:'p166', name:'Alyia Molan',        squad:'findplan', secondarySquad:null, role:'Business Analyst',            type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p167', name:'Dylie Jamieson',     squad:'findplan', secondarySquad:null, role:'Business Analyst',            type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p168', name:'Jeremy Hughes',      squad:'findplan', secondarySquad:null, role:'Lead Design Researcher',      type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p169', name:'Kristy Ferguson',    squad:'findplan', secondarySquad:null, role:'Lead Business Analyst',       type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  // CUST PLATFORM / Salesforce CRM
  {id:'p170', name:'Joseph Cavallaro',   squad:'sfcrm', secondarySquad:null, role:'Delivery Lead',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p171', name:'Azi Fakhfoori',      squad:'sfcrm', secondarySquad:null, role:'Tech Lead',                   type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p172', name:'Rui Wang',           squad:'sfcrm', secondarySquad:null, role:'Principal Engineer',          type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p173', name:'Sandra Appadoo',     squad:'sfcrm', secondarySquad:null, role:'Senior Business Analyst',     type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p174', name:'Andrew Yeo',         squad:'sfcrm', secondarySquad:null, role:'Lead Engineer',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p175', name:'Altus Baard',        squad:'sfcrm', secondarySquad:null, role:'Senior Engineer (.NET)',      type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p176', name:'Jasper Galapon',     squad:'sfcrm', secondarySquad:null, role:'Engineer (SF)',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p177', name:'Deepika Pentareddy', squad:'sfcrm', secondarySquad:null, role:'Engineer (SF)',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p178', name:'Amelia Ug',          squad:'sfcrm', secondarySquad:null, role:'Engineer (SF)',               type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p179', name:'Asim Hussein',       squad:'sfcrm', secondarySquad:null, role:'Snr QE/Automation',          type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  // CUST PLATFORM / PPNG
  {id:'p180', name:'James Johnson',      squad:'ppng_cp', secondarySquad:null, role:'Head of Customer Platforms',  type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
  {id:'p181', name:'Mai Ali',            squad:'ppng_cp', secondarySquad:null, role:'Senior Platform Engineer',    type:'perm', dayRate:null, agency:null, startDate:null, endDate:null, status:'active', nextAction:null, actionStatus:null, comments:''},
];

// Initiative start/end dates for roadmap & demand chart
const initiativeDates = {
  ppng:       { start: '2025-04-01', end: '2026-09-30' },
  rocket_i:   { start: '2025-01-01', end: '2026-08-31' },
  nzmkt:      { start: '2025-03-01', end: '2026-06-30' },
  nzloy:      { start: '2025-06-01', end: '2026-06-30' },
  tyrewise:   { start: '2025-09-01', end: '2026-04-30' },
  uteboot:    { start: '2025-10-01', end: '2026-05-31' },
  ocean:      { start: '2025-07-01', end: '2026-06-30' },
  stripe:     { start: '2026-01-01', end: '2026-09-30' },
  redsba:     { start: '2025-11-01', end: '2026-05-31' },
  ppecom_i:   { start: '2025-04-01', end: '2026-08-31' },
  retailmfa:  { start: '2025-12-01', end: '2026-04-30' },
  sfcrm_i:    { start: '2025-03-01', end: '2026-06-30' },
  futsch:     { start: '2026-02-01', end: '2026-10-31' },
  loyback:    { start: '2025-07-01', end: '2026-12-31' },
  incident:   { start: '2025-01-01', end: '2026-12-31' },
  apigee:     { start: '2025-06-01', end: '2026-09-30' },
  futcart:    { start: '2026-03-01', end: '2026-09-30' },
  crt:        { start: '2026-04-01', end: '2027-03-31' },
};

// Weekly capacity % per initiative across its duration
// workProfiles[initId] = array of weekly % values
const workProfiles = {};

// Tribe leadership designations — additional role, does not affect squad membership
// tribeLeadership[tribeId] = [personId|null, personId|null, personId|null, personId|null]
let tribeLeadership = {};

// Explicit display order of person cards within each squad column
// squadOrder[squadId] = [personId, ...] — people not listed appear at end
let squadOrder = {};

// FY27 planned headcount — single number for the whole org, editable on Overview
let fy27PlannedHeadcount = null;
