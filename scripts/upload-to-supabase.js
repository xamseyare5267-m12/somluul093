import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Configuration: Replace with your Supabase Project URL & Service Key (or anon key with bucket upload permissions)
const SUPABASE_URL = process.env.SUPABASE_URL || 'HTTPS_YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_OR_ANON_KEY';
const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'app-downloads';

if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR_SUPABASE')) {
  console.log('\n===========================================================');
  console.log('⚠️  SUPABASE CONFIGURATION NEEDED');
  console.log('Set SUPABASE_URL & SUPABASE_KEY environment variables.');
  console.log('Example:');
  console.log('export SUPABASE_URL="https://xyz.supabase.co"');
  console.log('export SUPABASE_KEY="eyJhbGciOi..."');
  console.log('===========================================================\n');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function uploadWindowsExe() {
  try {
    const distDir = path.resolve('dist_electron');
    if (!fs.existsSync(distDir)) {
      console.error(`❌ Dir not found: ${distDir}. Please run "npm run build:exe" first.`);
      process.exit(1);
    }

    const files = fs.readdirSync(distDir);
    const exeFile = files.find(f => f.endsWith('.exe'));

    if (!exeFile) {
      console.error('❌ No .exe file found inside dist_electron folder.');
      process.exit(1);
    }

    const filePath = path.join(distDir, exeFile);
    const fileBuffer = fs.readFileSync(filePath);
    const destinationPath = `windows/SomLuul_Setup_x64.exe`;

    console.log(`🚀 Uploading ${exeFile} (${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB) to Supabase Storage...`);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(destinationPath, fileBuffer, {
        contentType: 'application/x-msdownload',
        upsert: true
      });

    if (error) {
      console.error('❌ Supabase Upload Error:', error.message);
      process.exit(1);
    }

    // Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(destinationPath);

    console.log('\n✅ UPLOAD SUCCESSFUL!');
    console.log('-----------------------------------------------------------');
    console.log('📌 Supabase Storage Path:', data.path);
    console.log('🔗 Public Download URL for SomLuul.com:');
    console.log(publicUrlData.publicUrl);
    console.log('-----------------------------------------------------------\n');

  } catch (err) {
    console.error('❌ Script failed:', err);
    process.exit(1);
  }
}

uploadWindowsExe();
