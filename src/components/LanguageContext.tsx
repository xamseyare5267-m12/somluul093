import React, { createContext, useContext, useState, useEffect } from 'react';

const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    return '';
  }
  if (window.location.protocol === 'file:' || !window.location.hostname) {
    return 'https://https-file-somluul-com-854058746919.europe-west2.run.app';
  }
  return '';
};

export type LanguageCode = string;

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
  rtl?: boolean;
}

export const SUPPORTED_LANGUAGES: Language[] = [
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

// Fallback dictionary for seamless user experience while loading or if offline
const FALLBACK_DICTIONARY: Record<string, string> = {
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
  signin_desc: 'Log in to connect with the global SomLuul network',
  signup_desc: 'Sign up to start sharing and exploring',
  email_label: 'Email Address',
  pass_label: 'Password',
  remember_me: 'Remember Me',
  signin_btn: 'Login',
  signup_btn: 'Sign Up',
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
  admin_normal_user_label: 'Normal User',
  welcome_desc: 'Official verification and security system for SomLuul accounts.',
  login_desc: 'Log in with your email and password.',
  auth_signup_desc: 'Create an account to join our creative community.',
  auth_verify_desc: 'Enter the 6-digit verification code sent to your email.',
  phone_login_desc: 'Enter your phone number to receive an SMS OTP.',
  phone_otp_desc: 'Confirm the OTP code received on your phone.',
  forgot_desc: 'Recover your SomLuul account.',
  reset_desc: 'Set a new secure password.',
  continue_google: 'Continue with Google',
  continue_facebook: 'Continue with Facebook',
  continue_apple: 'Continue with Apple',
  or_use: 'Or use',
  first_name_label: 'First Name',
  last_name_label: 'Last Name',
  username_label: 'Username',
  bio_label: 'Short Biography (Bio)',
  dob_label: 'Date of Birth (DoB)',
  gender_label: 'Gender',
  male_label: 'Male',
  female_label: 'Female',
  accept_terms_label: 'I agree to the platform terms & safety standards',
  human_label: 'I am human (ReCaptcha)',
  phone_label: 'Phone Number',
  send_otp_btn: 'Request OTP Code',
  otp_code_label: 'Enter Verification Code',
  back_to_welcome_btn: 'Back to welcome page',
  finish_signup_btn: 'Complete Registration',
  recovery_code_label: 'Recovery Code',
  new_pass_label: 'New Password',
  confirm_pass_label: 'Confirm New Password',
  reset_btn: 'Reset Password',
  profile_all: 'All',
  profile_about: 'About',
  profile_photos: 'Photos',
  profile_friends: 'Friends',
  profile_videos: 'Short Videos',
  profile_security: 'Security & Devices',
  profile_personal_details: 'Personal Details',
  profile_lives_in: 'Lives in',
  profile_works_at: 'Works at',
  profile_born_on: 'Born on',
  profile_phone: 'Phone',
  profile_website: 'Website',
  profile_email: 'Email',
  profile_edit_details: 'Edit Details',
  profile_edit_bio: 'Edit Bio',
  profile_posts: 'Posts',
  profile_edit: 'Edit',
  profile_dashboard: 'Dashboard',
  profile_no_bio: 'No biography written yet.',
  profile_no_posts: 'No posts posted yet.',
  profile_change_cover: 'Change Cover',
  profile_choose_cover: 'Choose Preset Cover',
  profile_upload_from_device: 'Or upload from device',
  profile_upload_image: 'Upload Image',
  profile_update_info: 'Update Information',
  profile_save: 'Save',
  profile_cancel: 'Cancel',
  profile_no_photos: 'No photos uploaded yet.',
  profile_view_all: 'View All',
  profile_suggested_friends: 'Suggested Friends',
  profile_followers_count: 'followers',
  profile_following_count: 'following',
  profile_friends_mutual: 'friends',
  profile_friend_request_sent: 'Request Sent',
  profile_friend_request_accept: 'Accept Friend Request',
  profile_friend_add: 'Add Friend',
  profile_following: 'Following',
  profile_follow: 'Follow',
  profile_bio_placeholder: 'Write a short bio about yourself...',
  profile_avatar_title: 'Change profile picture',
};

const SOMALI_FALLBACK_DICTIONARY: Record<string, string> = {
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
  signup_desc: 'Is-diiwangeli si aad u bilowdo wadaaga iyo baaritaanka',
  email_label: 'Cinwaanka Emailka',
  pass_label: 'Furaha sirta ah',
  remember_me: 'I xasuuso',
  signin_btn: 'Soo Gal',
  signup_btn: 'Is-diiwangeli',
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
  admin_normal_user_label: 'Isticmaale Caadi ah',
  welcome_desc: 'Nidaamka rasmiga ah ee xaqiijinta iyo ilaalinta akoonada.',
  login_desc: 'Ku soo gal email-kaaga iyo furahaaga sirta ah.',
  auth_signup_desc: 'Abuur akoon si aad ula kulanto bulshada hal-abuurka leh.',
  auth_verify_desc: 'Geli koodhka 6-da god ah ee loo diray email-kaaga.',
  phone_login_desc: 'Geli telefoonkaaga si aan SMS OTP kuugu soo dirno.',
  phone_otp_desc: 'Ku xaqiiji koodhka ku soo gaaray telefoonkaaga.',
  forgot_desc: 'Dib u soo cesho akoonkaaga.',
  reset_desc: 'Deji password cusub si ammaan ah.',
  continue_google: 'Ku sii soco Google',
  continue_facebook: 'Ku sii soco Facebook',
  continue_apple: 'Ku sii soco Apple',
  or_use: 'Ama isticmaal',
  first_name_label: 'Magaca Koowaad',
  last_name_label: 'Magaca Qoyska',
  username_label: 'Magaca Isticmaalaha (Username)',
  bio_label: 'Taariikh Kooban (Bio)',
  dob_label: 'Taariikhda dhalashada (DoB)',
  gender_label: 'Lab ama Dheddig (Gender)',
  male_label: 'Lab (Male)',
  female_label: 'Dheddig (Female)',
  accept_terms_label: 'Waxaan ogolahay shuruudaha & amniga madasha',
  human_label: 'Waxaan ahay bini-aadam (ReCaptcha)',
  phone_label: 'Lambarka Telefoonka',
  send_otp_btn: 'Codso Koodhka OTP',
  otp_code_label: 'Geli Koodhka Xaqiijinta',
  back_to_welcome_btn: 'Ku laabo bogga hore',
  finish_signup_btn: 'Dhamaystir Diiwaangalinta',
  recovery_code_label: 'Koodhka Kabista',
  new_pass_label: 'Password Cusub',
  confirm_pass_label: 'Xaqiiji Password-ka',
  reset_btn: 'Cusboonaysii Furaha',
  profile_all: 'Dhammaan',
  profile_about: 'Ku saabsan',
  profile_photos: 'Sawirro',
  profile_friends: 'Saaxiibada',
  profile_videos: 'Muuqaallo gaagaban',
  profile_security: 'Amniga & Qalabka',
  profile_personal_details: 'Faahfaahinada shakhsiyeed',
  profile_lives_in: 'Wuxuu degan yahay',
  profile_works_at: 'Ku shaqeeya',
  profile_born_on: 'Wuxuu dhashay',
  profile_phone: 'Telefanka',
  profile_website: 'Mareegta',
  profile_email: 'Email-ka',
  profile_edit_details: 'Wax ka beddel faahfaahinta',
  profile_edit_bio: 'Wax ka beddel bio',
  profile_posts: 'Qoraalada',
  profile_edit: 'Wax ka beddel',
  profile_dashboard: 'Dashboard-ka',
  profile_no_bio: 'Weli ma jiro wax bio ah oo la qoray.',
  profile_no_posts: 'Wax qoraal ah laguuma soo dhigin.',
  profile_change_cover: 'Sawirka galka wax ka badal',
  profile_choose_cover: 'Dooro mid ka mid ah galka',
  profile_upload_from_device: 'Ama ka soo rar qalabkaaga',
  profile_upload_image: 'Rar Sawir',
  profile_update_info: 'Cusbooneysii Macluumaadka',
  profile_save: 'Kaydi',
  profile_cancel: 'Ka laabo',
  profile_no_photos: 'Malaha sawiro la soo dhigay.',
  profile_view_all: 'Arag dhamaan',
  profile_suggested_friends: 'Asxaabta laguu soo jeediyay',
  profile_followers_count: 'taageerayaal',
  profile_following_count: 'la socda',
  profile_friends_mutual: 'Saaxiibo',
  profile_friend_request_sent: 'Codsiga diran',
  profile_friend_request_accept: 'Aqbal Saaxiibnimada',
  profile_friend_add: 'Ku dar Saaxiib (Add Friend)',
  profile_following: 'La socda (Following)',
  profile_follow: 'La soco (Follow)',
  profile_bio_placeholder: 'Ku qor hadal kooban oo ku saabsan naftaada...',
  profile_avatar_title: 'Bedel sawirka profile-ka',
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => Promise<void>;
  t: (key: string) => string;
  isRtl: boolean;
  supportedLanguages: Language[];
  appName: string;
  appLogo: string;
  refreshConfig: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>('so'); // Defaulting to Soomaali
  const [dictionary, setDictionary] = useState<Record<string, string>>({});
  const [isRtl, setIsRtl] = useState(false);
  const [appName, setAppName] = useState('SomLuul');
  const [appLogo, setAppLogo] = useState('/somluul_logo.png');

  const fetchRemoteConfig = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/remote-config`);
      if (response.ok) {
        const data = await response.json();
        if (data.appName) {
          setAppName(data.appName);
        }
        if (data.appLogo) {
          setAppLogo(data.appLogo);
        }
      }
    } catch (err) {
      console.warn('Failed to load remote config in LanguageProvider:', err);
    }
  };

  useEffect(() => {
    fetchRemoteConfig();
    const handleUpdate = () => {
      fetchRemoteConfig();
    };
    window.addEventListener('remote-config-updated', handleUpdate);
    return () => window.removeEventListener('remote-config-updated', handleUpdate);
  }, []);

  const loadDictionary = async (langCode: string) => {
    // Set immediate synchronous fallback based on language to avoid empty state flash
    if (langCode === 'so') {
      setDictionary(SOMALI_FALLBACK_DICTIONARY);
    } else if (langCode === 'en') {
      setDictionary(FALLBACK_DICTIONARY);
    } else {
      setDictionary(FALLBACK_DICTIONARY);
    }

    try {
      const response = await fetch(`/locales/${langCode}.json`);
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && (contentType.includes('application/json') || contentType.includes('text/plain') || !contentType.includes('text/html'))) {
        const text = await response.text();
        if (text && text.trim().startsWith('{')) {
          const dict = JSON.parse(text);
          setDictionary(prev => ({ ...prev, ...dict }));
        }
      }
    } catch {
      // Graceful silent fallback to built-in dictionaries
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('somluul_lang');
    const validCodes = SUPPORTED_LANGUAGES.map(l => l.code);
    
    let initialLang = 'so';
    if (saved && validCodes.includes(saved)) {
      initialLang = saved;
    } else {
      const browserLang = navigator.language.substring(0, 2);
      if (validCodes.includes(browserLang)) {
        initialLang = browserLang;
      }
    }
    
    setLanguageState(initialLang);
    loadDictionary(initialLang);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('somluul_lang');
      if (saved && saved !== language) {
        setLanguageState(saved);
        loadDictionary(saved);
        return;
      }

      const sessionStr = localStorage.getItem('auth_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          if (session && session.user && session.user.language) {
            const userLang = session.user.language;
            const validCodes = SUPPORTED_LANGUAGES.map(l => l.code);
            if (validCodes.includes(userLang) && userLang !== language) {
              setLanguageState(userLang);
              loadDictionary(userLang);
              localStorage.setItem('somluul_lang', userLang);
            }
          }
        } catch (e) {
          console.warn('Error syncing user language from session:', e);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    handleStorageChange();
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [language]);

  useEffect(() => {
    const selectedLang = SUPPORTED_LANGUAGES.find(l => l.code === language);
    setIsRtl(!!selectedLang?.rtl);
    if (selectedLang?.rtl) {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  }, [language]);

  const setLanguage = async (code: LanguageCode) => {
    setLanguageState(code);
    localStorage.setItem('somluul_lang', code);
    await loadDictionary(code);

    try {
      const sessionStr = localStorage.getItem('auth_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session && session.user && session.user.id) {
          const response = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.token}`
            },
            body: JSON.stringify({
              first_name: session.user.first_name,
              last_name: session.user.last_name,
              language: code
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data && data.user) {
              session.user = data.user;
              localStorage.setItem('auth_session', JSON.stringify(session));
              localStorage.setItem(`somluul_profile_backup_${session.user.id}`, JSON.stringify(session.user));
              window.dispatchEvent(new Event('storage'));
            }
          }
        }
      }
    } catch (err) {
      console.warn('Could not sync language update to server database:', err);
    }
  };

  const t = (key: string): string => {
    let text = key;
    if (language === 'so') {
      text = dictionary[key] || SOMALI_FALLBACK_DICTIONARY[key] || FALLBACK_DICTIONARY[key] || key;
    } else {
      text = dictionary[key] || FALLBACK_DICTIONARY[key] || key;
    }
    if (appName && appName !== 'SomLuul') {
      text = text.replace(/SomLuul/g, appName);
    }
    return text;
  };

  const refreshConfig = async () => {
    await fetchRemoteConfig();
  };

  const getLogoWithCacheBuster = (logoUrl: string | null | undefined) => {
    if (!logoUrl || logoUrl.trim() === '' || logoUrl.includes('somluul_logo')) {
      return '/somluul_logo.png';
    }
    return logoUrl;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl, supportedLanguages: SUPPORTED_LANGUAGES, appName, appLogo: getLogoWithCacheBuster(appLogo), refreshConfig }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
