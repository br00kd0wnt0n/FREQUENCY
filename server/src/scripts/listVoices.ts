import { elevenlabsClient } from '../config/elevenlabs';

async function listVoices() {
  console.log('Fetching available ElevenLabs voices...\n');

  const voices = await elevenlabsClient.getVoices();

  if (voices.length === 0) {
    console.log('No voices found. Make sure ELEVENLABS_API_KEY is set correctly.');
    return;
  }

  console.log('Available voices:\n');
  console.log('=' .repeat(60));

  for (const voice of voices) {
    console.log(`Name: ${voice.name}`);
    console.log(`ID:   ${voice.voice_id}`);
    console.log(`Type: ${voice.category || 'unknown'}`);
    console.log('-'.repeat(60));
  }

  console.log(`\nTotal: ${voices.length} voices`);
  console.log('\nTo use a voice, update the character in the database:');
  console.log(`UPDATE characters SET elevenlabs_voice_id = 'VOICE_ID_HERE' WHERE callsign = 'NIGHTBIRD';`);
}

listVoices().catch(console.error);
