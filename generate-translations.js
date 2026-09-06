import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY environment variable is missing.');
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'so', name: 'Soomaali', flag: '🇸🇴' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰', rtl: true },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷', rtl: true },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'he', name: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
  { code: 'am', name: 'አማርኛ', flag: '🇪🇹' },
  { code: 'ha', name: 'Hausa', flag: '🌍' },
  { code: 'yo', name: 'Yorùbá', flag: '🌍' },
  { code: 'zu', name: 'isiZulu', flag: '🌍' }
];

const enDict = {
  nav_feed: 'Home Feed',
  nav_messenger: 'Messenger',
  nav_marketplace: 'Marketplace',
  nav_monetization: 'Creator Hub',
  nav_storage: 'Cloud Storage',
  nav_admin: 'Super Admin',
  nav_downloads: 'Download Apps',
  nav_support: 'Support Center',
  nav_logout: 'Sign Out',
  welcome_back: 'Welcome to SomLuul',
  signin_desc: 'Sign in to connect with the global SomLuul network',
  signup_desc: 'Create an account to start sharing and exploring',
  email_label: 'Email Address',
  pass_label: 'Password',
  remember_me: 'Remember Me',
  signin_btn: 'Sign In',
  signup_btn: 'Create Account',
  no_account: "Don't have an account?",
  have_account: 'Already have an account?',
  verify_email: 'Verify Your Email',
  verify_desc: 'A verification email has been dispatched to your address.',
  verify_btn: 'Verify and Proceed',
  forgot_pass: 'Forgot Password?',
  reset_pass: 'Reset Password',
  feed_title: 'Global Feed',
  mind_placeholder: 'What is on your mind today?',
  post_btn: 'Post',
  sponsored_label: 'Sponsored Ad',
  like: 'Like',
  comment: 'Comment',
  share: 'Share',
  comments_title: 'Comments',
  write_comment: 'Write a comment...',
  saved_posts: 'Saved Posts',
  stories_title: 'Stories',
  reels_title: 'Reels & Streams',
  chats_title: 'Chats & Rooms',
  secret_chat: 'Secret Chat (Private / protected)',
  search_chats: 'Search messages and friends...',
  type_message: 'Type a message securely...',
  voice_msg: 'Record Voice Message',
  typing: 'is typing...',
  online_now: 'Online',
  last_seen: 'Last seen recently',
  call_voice: 'Voice Call HD',
  call_video: 'Video Call HD',
  group_call: 'Group Call',
  screen_share: 'Screen Share',
  noise_cancel: 'Noise Cancel: ON',
  noise_cancel_off: 'Noise Cancel: OFF',
  captions_on: 'Live Captions: ON',
  captions_off: 'Live Captions: OFF',
  recording: 'Call Recording Active',
  end_call: 'End Call',
  marketplace_title: 'SomLuul Marketplace',
  marketplace_desc: 'Buy and Sell items securely within your local and global community',
  all_categories: 'All Categories',
  electronics: 'Electronics',
  property: 'Property',
  vehicles: 'Vehicles',
  fashion: 'Fashion',
  others: 'Others',
  sell_btn: 'Sell an Item',
  price: 'Price',
  location: 'Location',
  item_title: 'Item Title',
  item_desc: 'Description',
  message_seller: 'Message Seller',
  review_stars: 'Reviews',
  post_item: 'List Item',
  creator_title: 'Creator & Business Hub',
  creator_desc: 'Monetize your posts, schedule sponsored campaigns, and manage payment configurations.',
  wallet_bal: 'Wallet Balance',
  earnings_month: 'Earnings This Month',
  views_stat: 'Total Video Views',
  followers_stat: 'Total Followers',
  watch_stat: 'Watch Minutes',
  platform_fee: 'Platform Fee (Owner Share)',
  payout_btn: 'Withdraw Earnings',
  withdraw_success: 'Withdrawal request initiated successfully!',
  min_monetize_req: 'Monetization Eligibility Standards',
  monetization_req_desc: 'To begin earning from feed posts and reels, you must meet the following metrics:',
  req_followers: 'Required Followers',
  req_views: 'Required Monthly Views',
  create_ad: 'Create Advertisement Campaign',
  ad_budget: 'Daily Budget ($)',
  ad_country: 'Target Country',
  ad_lang: 'Target Language',
  ad_title: 'Campaign Heading',
  ad_image: 'Banner URL',
  launch_campaign: 'Launch Campaign',
  impressions: 'Impressions',
  clicks: 'Clicks',
  conversions: 'Conversions',
  admin_title: 'Super Admin Control Center',
  admin_desc: 'Real-time overview of server, users, logs, monetization fees, and system security alerts.',
  online_users: 'Online Users Now',
  registrations: 'New Registrations',
  server_status: 'Server Status',
  database_status: 'Database Health',
  total_rev: 'Total Platform Revenue',
  logs_title: 'System Audit Logs',
  suspend_user: 'Suspend User',
  ban_user: 'Ban Account',
  pwa_status: 'PWA Offline Mode: Active',
  support_title: 'Help & Safety Center',
  about_us: 'About SomLuul',
  services: 'Our Services',
  privacy_policy: 'Privacy Policy',
  terms_service: 'Terms & Conditions',
  cookies_policy: 'Cookies Policy',
  careers: 'Careers',
  blog: 'Platform Blog',
  news: 'Company News',
  faq: 'Frequently Asked Questions',
  contact_us: 'Contact Us',
  community_guidelines: 'Community Guidelines',
  safety_center: 'Safety Center',
  friends: 'Friends',
  dashboard: 'Dashboard',
  memories: 'Memories',
  saved: 'Saved',
  groups: 'Groups',
  reels: 'Reels',
  see_more: 'See More',
  see_less: 'See Less',
  your_shortcuts: 'Your Shortcuts',
  edit: 'Edit',
  manage: 'Manage',
  exit: 'Exit',
  ludo_world: 'SomLuul Ludo World',
  somluul_creators: 'SomLuul Creators',
  live_video: 'Live Video',
  photo_video: 'Photo/Video',
  feeling_activity: 'Feeling/Activity',
  publishing: 'Publishing...',
  owner_section: 'Owner Controls',
  add_story: 'Add Story',
  create_story: 'Create Story',
  loading_posts: 'Loading posts...',
  no_posts_yet: 'No posts published yet.',
  be_first_post: 'Be the first one to share a post with the community!',
  storage_personal_title: 'Personal Cloud Storage',
  storage_personal_desc: 'Securely upload, organize, preview and share your critical documents and media.',
  storage_upload_btn: 'Upload New File',
  storage_collapse_btn: 'Collapse Uploader',
  storage_my_files: 'My Files',
  storage_activity_logs: 'Activity Logs',
  storage_dropbox_uploader: 'File Dropbox Uploader',
  storage_used_label: 'Storage Used',
  storage_total_files_label: 'Total Files',
  storage_images_label: 'Images',
  storage_videos_label: 'Videos',
  storage_documents_label: 'Documents',
  storage_search_placeholder: 'Search files by name...',
  storage_cat_all: 'All',
  storage_cat_images: 'Images',
  storage_cat_docs: 'Docs',
  storage_cat_videos: 'Videos',
  storage_sort_newest: 'Newest Uploaded',
  storage_sort_oldest: 'Oldest Uploaded',
  storage_sort_name_asc: 'Name (A-Z)',
  storage_sort_name_desc: 'Name (Z-A)',
  storage_sort_size_desc: 'Largest Size',
  storage_sort_size_asc: 'Smallest Size',
  storage_no_files: 'No matching files found',
  storage_no_files_desc: 'Try adjusting your search criteria or filters.',
  storage_showing_page: 'Showing page',
  storage_page_of: 'of',
  storage_activity_history: 'Your Activity History',
  storage_activity_desc: 'Track all your activities related to uploading, downloading, and deleting files.',
  storage_refresh_btn: 'Refresh',
  storage_loading_history: 'Loading history...',
  storage_no_activity: 'No activity yet',
  storage_no_activity_desc: 'Your file activities will automatically appear here.',
  storage_action_header: 'Action',
  storage_details_header: 'Details',
  storage_date_header: 'Date & Time',
  storage_action_upload: 'Uploaded',
  storage_action_delete: 'Deleted',
  storage_action_profile: 'Profile Updated',
  storage_confirm_delete: 'Confirm File Deletion',
  storage_delete_warning: 'Are you absolutely sure you want to delete this file? This action is permanent and cannot be undone.',
  storage_delete_permanently: 'Delete Permanently',
  storage_cancel: 'Cancel',
  admin_cmd_title: 'Administrator Command Center',
  admin_cmd_desc: 'Perform user audits, storage limits oversight, system analytics, and content moderation.',
  admin_users_label: 'System Users',
  admin_suspended_label: 'Suspended Users',
  admin_global_files_label: 'Global Files',
  admin_physical_size_label: 'Physical Size',
  admin_tab_users: 'Registered Users',
  admin_tab_files: 'Files Moderation',
  admin_tab_logs: 'System Audit Logs',
  admin_search_users_placeholder: 'Search users by name, email or handle...',
  admin_search_files_placeholder: 'Search system files by name...',
  admin_search_logs_placeholder: 'Search audit logs by email or action...',
  admin_users_count_suffix: 'active accounts',
  admin_suspended_count_suffix: 'denied system login',
  admin_files_count_suffix: 'across all storage buckets',
  admin_size_count_suffix: 'total disk utilization',
  admin_col_user: 'User / Profile',
  admin_col_role: 'Role',
  admin_col_status: 'Status',
  admin_col_joined: 'Joined Date',
  admin_col_actions: 'Actions',
  admin_btn_block: 'Block',
  admin_btn_unblock: 'Unblock',
  admin_btn_purge_files: 'Purge Files',
  admin_btn_delete_user: 'Delete User',
  admin_col_filename: 'Filename',
  admin_col_owner: 'File Owner',
  admin_col_size: 'File Size',
  admin_col_uploaded: 'Uploaded At',
  admin_btn_preview: 'Preview',
  admin_btn_delete_file: 'Delete',
  admin_col_actor: 'Actor',
  admin_col_action: 'Action Performed',
  admin_col_details: 'Log Details',
  admin_col_timestamp: 'Timestamp',
  admin_confirm_title: 'Administrative Confirmation',
  admin_confirm_block_desc: 'Are you sure you want to block this user? They will be immediately logged out and blocked from logging back in.',
  admin_confirm_unblock_desc: 'Are you sure you want to unblock this user? They will be immediately allowed to log back in.',
  admin_confirm_purge_desc: 'Are you sure you want to permanently delete ALL files uploaded by this user? This cannot be undone.',
  admin_confirm_delete_user_desc: 'Are you sure you want to permanently delete this user account? This cannot be undone.',
  admin_confirm_file_desc: 'Are you sure you want to permanently delete this file from the global filesystem? This cannot be undone.',
  admin_btn_confirm: 'Confirm Action',
  admin_btn_cancel: 'Cancel',
  admin_owner_label: 'SomLuul Owner',
  admin_administrator_label: 'Administrator',
  admin_normal_user_label: 'Normal User'
};

// Existing translated dictionaries to avoid API calls and keep 100% correct
const PRE_SEEDED = {
  en: enDict,
  so: {
    nav_feed: 'Fidka Guriga',
    nav_messenger: 'Farriimaha',
    nav_marketplace: 'Suuqa',
    nav_monetization: 'Xarunta Hal-abuurka',
    nav_storage: 'Kaydka Cloud-ka',
    nav_admin: 'Maamulaha Sare',
    nav_downloads: 'Dajiso Barnaamijyada',
    nav_support: 'Taageerada & Amniga',
    nav_logout: 'Ka Bax',
    welcome_back: 'Ku soo dhawaada SomLuul',
    signin_desc: 'Soo gal si aad ula xiriirto bulshada caalamiga ah ee SomLuul',
    signup_desc: 'Abuur akoon si aad u bilowdo wadaaga iyo baaritaanka',
    email_label: 'Cinwaanka Emailka',
    pass_label: 'Furaha sirta ah',
    remember_me: 'I xasuuso',
    signin_btn: 'Soo Gal',
    signup_btn: 'Abuur Akoon',
    no_account: 'Miyaadan lahayn akoon?',
    have_account: 'Ma leedahay akoon horey u jiray?',
    verify_email: 'Xaqiiji Emailkaaga',
    verify_desc: 'Email xaqiijin ah ayaa loo diray cinwaankaaga.',
    verify_btn: 'Xaqiiji oo Sii soco',
    forgot_pass: 'Ma ilowday furaha?',
    reset_pass: 'Dib u dajinta furaha',
    feed_title: 'Fidka Caalamiga ah',
    mind_placeholder: 'Maxaa maskaxdaada ku jira maanta?',
    post_btn: 'La wadaag',
    sponsored_label: 'Xayeysiis',
    like: 'Jeclow',
    comment: 'Fikir ka dhiibo',
    share: 'Wadaag',
    comments_title: 'Fikradaha',
    write_comment: 'Qor fikirkaaga...',
    saved_posts: 'Qoraalada la kaydiyay',
    stories_title: 'Sheekooyin',
    reels_title: 'Fiidiyowyo gaagaaban & Toos',
    chats_title: 'Wada-hadalada',
    secret_chat: 'Sheeko qarsoodi ah (E2E Encrypted)',
    search_chats: 'Raadi fariimaha iyo asxaabta...',
    type_message: 'Qor fariin amaan ah...',
    voice_msg: 'Duub codka fariinta',
    typing: 'ayaa qoraya...',
    online_now: 'Online',
    last_seen: 'Goor dhow ayuu ku dambeeyay',
    call_voice: 'Wicitaan Cod HD ah',
    call_video: 'Wicitaan Muuqaal HD ah',
    group_call: 'Wicitaan Kooxeed',
    screen_share: 'Wadaag Shaashadda',
    noise_cancel: 'Dhimista Sawaxanka: JIRTA',
    noise_cancel_off: 'Dhimista Sawaxanka: MA JIRTO',
    captions_on: 'Qoraalka Tooska ah: JIRA',
    captions_off: 'Qoraalka Tooska ah: MA JIRO',
    recording: 'Wicitaanku wuu duubmayaa',
    end_call: 'Jar Wicitaanka',
    marketplace_title: 'Suuqa SomLuul',
    marketplace_desc: 'Iibso oo iibi agab si amaan ah bulshada dhexdeeda',
    all_categories: 'Dhamaan Qeybaha',
    electronics: 'Aaladaha Elektrooniga',
    property: 'Guryaha & Dhulka',
    vehicles: 'Gaadiidka',
    fashion: 'Dharka & Quruxda',
    others: 'Agabyada kale',
    sell_btn: 'Iibi shay',
    price: 'Qiimaha',
    location: 'Goobta',
    item_title: 'Magaca Shayga',
    item_desc: 'Sharaxaad',
    message_seller: 'La xiriir iibiyaha',
    review_stars: 'Qiimaynta asxaabta',
    post_item: 'Geli Shayga Suuqa',
    creator_title: 'Xarunta Hal-abuurka & Ganacsiga',
    creator_desc: 'Lacag ka samee qoraaladaada, samee xayeysiisyo, oo maamul jeebkaaga.',
    wallet_bal: 'Haraaga Jeebka',
    earnings_month: 'Dakhliga Bisha',
    views_stat: 'Muuqaalada la daawaday',
    followers_stat: 'Taageerayaasha',
    watch_stat: 'Daqiiqadaha Daawashada',
    platform_fee: 'Qaybta SomLuul (Platform Fee)',
    payout_btn: 'La bax Dakhliga',
    withdraw_success: 'Codsiga bixinta dakhliga si guul leh ayaa loo bilaabay!',
    min_monetize_req: 'Shuruudaha Sameynta Lacagta',
    monetization_req_desc: 'Si aad u bilowdo dakhli ka samaynta fiidiyowyada iyo fidka, waa inaad buuxisaa:',
    req_followers: 'Taageerayaasha Loo Baahan Yahay',
    req_views: 'Daawashada Bisha ee Loo Baahan Yahay',
    create_ad: 'Abuur Xayeysiis cusub',
    ad_budget: 'Miisaaniyada Maalinta ($)',
    ad_country: 'Dalka Loo Hadafayo',
    ad_lang: 'Luuqada Loo Hadafayo',
    ad_title: 'Mowduuca Xayeysiiska',
    ad_image: 'Sawirka Linkigiisa',
    launch_campaign: 'Bilow Xayeysiiska',
    impressions: 'Soo bandhigid',
    clicks: 'Riixitaan',
    conversions: 'Iibsasho',
    admin_title: 'Xarunta Control-ka ee Maamulaha Sare',
    admin_desc: 'Kormeerka tooska ah ee server-ka, isticmaalayaasha, diiwaanka dakhliga, iyo amniga.',
    online_users: 'Dadka hadda online-ka ah',
    registrations: 'Diiwaan-gelinta Cusub',
    server_status: 'Xaaladda Server-ka',
    database_status: 'Caafimaadka Database-ka',
    total_rev: 'Dakhliga Guud ee Platform-ka',
    logs_title: 'Diiwaanka logs-ka nidaamka',
    suspend_user: 'Xanib isticmaalaha',
    ban_user: 'Tirtir akoonka',
    pwa_status: 'Awoodda Offline-ka (PWA): Firfircoon',
    support_title: 'Xarunta Caawinaada & Amniga',
    about_us: 'Ku saabsan SomLuul',
    services: 'Adeegyadeena',
    privacy_policy: 'Sharciga Badbaadada Macluumaadka',
    terms_service: 'Shuruudaha Adeega',
    cookies_policy: 'Sharciga Cookies-ka',
    careers: 'Fursadaha Shaqo',
    blog: 'Blog-ga SomLuul',
    news: 'Wararka Shirkadda',
    faq: 'Su’aalaha badanaa la is weydiiyo',
    contact_us: 'Nala soo xiriir',
    community_guidelines: 'Xeerarka Bulshada',
    safety_center: 'Xarunta Badbaadada',
    friends: 'Saaxiibada',
    dashboard: 'Dashboard',
    memories: 'Xusuusyada',
    saved: 'La Kaydiyay',
    groups: 'Kooxaha',
    reels: 'Reels',
    see_more: 'Eeg Shax kale',
    see_less: 'Eeg wax yar',
    your_shortcuts: 'Gaabanayaashaada',
    edit: 'Wax ka badal',
    manage: 'Maamul',
    exit: 'Kabax',
    ludo_world: 'SomLuul Ludo World',
    somluul_creators: 'SomLuul Creators',
    live_video: 'Toos u baahis',
    photo_video: 'Sawir/Muuqaal',
    feeling_activity: 'Dareen/Waxqabad',
    publishing: 'La wadaagayaa...',
    owner_section: 'Maamulka Mulkiilaha',
    add_story: 'Ku dar Sheeko',
    create_story: 'Abuur Sheeko',
    loading_posts: 'La soo raranayaa qoraallada...',
    no_posts_yet: 'Ma jiraan qoraallo la wadaagay weli.',
    be_first_post: 'Noqo qofka ugu horreeya ee qoraal la wadaaga bulshada!',
    storage_personal_title: 'Kaydka Cloud-ka Shakhsiga',
    storage_personal_desc: 'Si ammaan ah u geli, u habayso, u eeg, una wadaag dukumeentiyadaada iyo warbaahintaada muhiimka ah.',
    storage_upload_btn: 'Geli Fayl Cusub',
    storage_collapse_btn: 'Laabi Fayl Geliyaha',
    storage_my_files: 'Faylashayda',
    storage_activity_logs: 'Diiwaanka Waxqabadka',
    storage_dropbox_uploader: 'Sanduuqa Gelinta Faylka',
    storage_used_label: 'Booska la isticmaalay',
    storage_total_files_label: 'Faylasha Guud',
    storage_images_label: 'Sawirrada',
    storage_videos_label: 'Muuqaallada',
    storage_documents_label: 'Dukumeentiyada',
    storage_search_placeholder: 'Raadi faylasha adigoo isticmaalaya magac...',
    storage_cat_all: 'Dhammaan',
    storage_cat_images: 'Sawirro',
    storage_cat_docs: 'Dukumeentiyo',
    storage_cat_videos: 'Muuqaallo',
    storage_sort_newest: 'Ugu Dambeeyay',
    storage_sort_oldest: 'Ugu Horreeyay',
    storage_sort_name_asc: 'Magaca (A-Z)',
    storage_sort_name_desc: 'Magaca (Z-A)',
    storage_sort_size_desc: 'Ugu weyn',
    storage_sort_size_asc: 'Ugu yar',
    storage_no_files: 'Wax fayl ah oo u dhigma lama helin',
    storage_no_files_desc: 'Isku day inaad wax ka beddesho ereyada raadinta ama filtarrada.',
    storage_showing_page: 'Muujinaya bogga',
    storage_page_of: 'ee',
    storage_activity_history: 'Taariikhda Waxqabadkaaga',
    storage_activity_desc: 'La soco dhammaan waxqabadyadaada la xiriira gelinta, soo dejinta, iyo tirtirista faylasha.',
    storage_refresh_btn: 'Cusbooneysii',
    storage_loading_history: 'La soo raranayaa taariikhda...',
    storage_no_activity: 'Ma jiro waxqabad weli',
    storage_no_activity_desc: 'Waxqabadyadaada faylasha ayaa si toos ah halkan uga soo muuqan doona.',
    storage_action_header: 'Waxqabadka',
    storage_details_header: 'Faahfaahinta',
    storage_date_header: 'Taariikhda & Waqtiga',
    storage_action_upload: 'La Galiyay',
    storage_action_delete: 'La Tirtiray',
    storage_action_profile: 'Profile-ka la cusbooneysiiyay',
    storage_confirm_delete: 'Xaqiiji Tirtirista Faylka',
    storage_delete_warning: 'Ma hubaal baad tahay inaad rabto inaad tirtirto faylkan? Tallaabadan waa mid joogto ah oo dib looma celin karo.',
    storage_delete_permanently: 'Tirtir si Joogto ah',
    storage_cancel: 'Buri',
    admin_cmd_title: 'Xarunta Amarrada Maamulaha',
    admin_cmd_desc: 'Samee hantidhowrka isticmaalayaasha, maamul xadka kaydka, falanqaynta nidaamka, iyo dhexdhexaadinta nuxurka.',
    admin_users_label: 'Isticmaalayaasha Nidaamka',
    admin_suspended_label: 'Xubnaha la Xanibay',
    admin_global_files_label: 'Faylasha Guud',
    admin_physical_size_label: 'Booska uu Koobiyeeyay',
    admin_tab_users: 'Isticmaalayaasha Diiwaangashan',
    admin_tab_files: 'Dhexdhexaadinta Faylasha',
    admin_tab_logs: 'Diiwaanka Hantidhowrka Nidaamka',
    admin_search_users_placeholder: 'Ku raadi isticmaale magac, email ama handle...',
    admin_search_files_placeholder: 'Ku raadi faylasha nidaamka magac...',
    admin_search_logs_placeholder: 'Ku raadi diiwaanka email ama waxqabad...',
    admin_users_count_suffix: 'akoonno firfircoon',
    admin_suspended_count_suffix: 'loo diiday gelitaanka nidaamka',
    admin_files_count_suffix: 'dhammaan weelasha kaydka',
    admin_size_count_suffix: 'guud ahaan isticmaalka diskiga',
    admin_col_user: 'Isticmaale / Profile',
    admin_col_role: 'Doorka',
    admin_col_status: 'Xaaladda',
    admin_col_joined: 'Taariikhda Ku Biirista',
    admin_col_actions: 'Tallaabooyinka',
    admin_btn_block: 'Xanib',
    admin_btn_unblock: 'Fure xanibaadda',
    admin_btn_purge_files: 'Sifee Faylasha',
    admin_btn_delete_user: 'Tirtir Akoonka',
    admin_col_filename: 'Magaca Faylka',
    admin_col_owner: 'Mulkiilaha Faylka',
    admin_col_size: 'Baaxadda Faylka',
    admin_col_uploaded: 'La Galiyay Waqtiga',
    admin_btn_preview: 'Horay u eeg',
    admin_btn_delete_file: 'Tirtir',
    admin_col_actor: 'Maamule',
    admin_col_action: 'Tallaabada La Sameeyay',
    admin_col_details: 'Faahfaahinta Diiwaanka',
    admin_col_timestamp: 'Waqtiga Saxda ah',
    admin_confirm_title: 'Xaqiijinta Maamulka',
    admin_confirm_block_desc: 'Ma hubaal baad tahay inaad rabto inaad xanibto isticmaalahan? Si degdeg ah ayaa looga saari doonaa nidaamka, loomana ogolaan doono inuu dib u soo galo.',
    admin_confirm_unblock_desc: 'Ma hubaal baad tahay inaad rabto inaad ka qaaddo xanibaadda isticmaalahan? Si degdeg ah ayaa loogu oggolaan doonaa inay dib u soo galaan.',
    admin_confirm_purge_desc: 'Ma hubaal baad tahay inaad rabto inaad si joogto ah u tirtirto DHAMMAAN faylasha uu soo galiyay isticmaalahan? Tallaabadan dib looma celin karo.',
    admin_confirm_delete_user_desc: 'Ma hubaal baad tahay inaad rabto inaad si joogto ah u tirtirto akoonkan isticmaalaha? Tallaabadan dib looma celin karo.',
    admin_confirm_file_desc: 'Ma hubaal baad tahay inaad rabto inaad si joogto ah u tirtirto faylkan kaydka guud? Tallaabadan dib looma celin karo.',
    admin_btn_confirm: 'Xaqiiji Tallaabada',
    admin_btn_cancel: 'Buri',
    admin_owner_label: 'Mulkiilaha SomLuul',
    admin_administrator_label: 'Maamule Sare',
    admin_normal_user_label: 'Isticmaale Caadi ah'
  }
};

const localesDir = path.join(process.cwd(), 'public', 'locales');
if (!fs.existsSync(localesDir)) {
  fs.mkdirSync(localesDir, { recursive: true });
}

async function translateDictionary(langName, langCode) {
  const prompt = `You are an expert translator. Translate the following English localization dictionary of a social media platform called "SomLuul" into ${langName} (${langCode}).
Return ONLY a valid, raw JSON object containing the exact same keys as the input, with the values professionally and naturally translated to ${langName}.
Do not include any markdown fences, backticks, comments, or extra text. Just return the JSON itself.

English Dictionary:
${JSON.stringify(enDict, null, 2)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    });

    const text = response.text.trim();
    // Verify it is valid JSON
    const parsed = JSON.parse(text);
    return parsed;
  } catch (err) {
    console.error(`Error translating for language ${langName} (${langCode}):`, err);
    throw err;
  }
}

async function main() {
  console.log('Starting dictionary translation pipeline...');

  for (const lang of SUPPORTED_LANGUAGES) {
    const filePath = path.join(localesDir, `${lang.code}.json`);
    
    // Skip if file already exists with content
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content && JSON.parse(content)) {
          console.log(`Skipping ${lang.name} (${lang.code}) - translation already exists.`);
          continue;
        }
      } catch (e) {
        console.log(`Existing file for ${lang.name} (${lang.code}) is invalid. Re-translating...`);
      }
    }

    // Check if we have pre-seeded data
    if (PRE_SEEDED[lang.code]) {
      console.log(`Writing pre-seeded dictionary for ${lang.name} (${lang.code})...`);
      fs.writeFileSync(filePath, JSON.stringify(PRE_SEEDED[lang.code], null, 2), 'utf8');
      continue;
    }

    // Otherwise, translate using Gemini
    console.log(`Translating dictionary for ${lang.name} (${lang.code}) using Gemini...`);
    let retries = 3;
    let success = false;
    while (retries > 0 && !success) {
      try {
        const translated = await translateDictionary(lang.name, lang.code);
        fs.writeFileSync(filePath, JSON.stringify(translated, null, 2), 'utf8');
        console.log(`SUCCESS: Saved translation to ${lang.code}.json`);
        success = true;
      } catch (err) {
        retries--;
        console.log(`Failed. Retries left: ${retries}`);
        if (retries > 0) {
          console.log('Waiting 2 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!success) {
      console.error(`CRITICAL: Failed to translate for ${lang.name} (${lang.code}) after multiple attempts.`);
    }

    // Brief delay to avoid rate limit throttling
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('Translation generation complete!');
}

main().catch(err => {
  console.error('Fatal error in translation script:', err);
  process.exit(1);
});
