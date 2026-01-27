import { pool, query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  if (!pool) {
    console.error('DATABASE_URL not configured. Cannot seed database.');
    process.exit(1);
  }

  console.log('Seeding database...');

  try {
    // Seed characters
    const characters = [
      {
        id: uuidv4(),
        callsign: 'NIGHTBIRD',
        display_name: 'Helena Cross',
        frequency: 28.200,
        elevenlabs_voice_id: 'placeholder_voice_id_helena',
        voice_description: 'Calm, measured, slight Southern accent. Sounds tired.',
        personality_prompt: `You are Helena Cross, callsign NIGHTBIRD. You've been operating this frequency for 8 years. You knew Marcus before he disappeared. You're cautious with strangers but will open up if they seem genuine. You speak in complete sentences, thoughtfully, with occasional long pauses. You're haunted by something but won't say what directly.`,
        speaking_style: "Thoughtful, measured pace. Uses 'I reckon' and 'honey' occasionally. Sighs before difficult topics. Never rushes.",
        background: "Former nurse, now lives alone outside town. Was close to Marcus. Knows more than she lets on about the night of the incident.",
        knowledge: JSON.stringify({
          marcus: "Knew him well. He was troubled near the end. Kept talking about signals he was picking up.",
          the_tower: "Old radio tower on Miller's Ridge. Hasn't worked in decades. Or so they say.",
          dusty: "Good kid, but he's scared. Knows something he won't tell me.",
          the_night: "I heard things on the radio that night. Things I can't explain."
        }),
        secrets: JSON.stringify([
          "Marcus gave her something before he disappeared - a frequency written on paper",
          "She's been hearing his voice on static some nights",
          "She knows the tower isn't abandoned"
        ]),
        relationships: JSON.stringify({
          dusty: "Protective, worried about him",
          operator_9: "Suspicious, doesn't trust them",
          marcus: "Deep grief, possibly love"
        }),
        initial_disposition: 'cautious'
      },
      {
        id: uuidv4(),
        callsign: 'DUSTY',
        display_name: 'Dusty Martinez',
        frequency: 27.450,
        elevenlabs_voice_id: 'placeholder_voice_id_dusty',
        voice_description: 'Young, nervous energy. Quick talker when anxious.',
        personality_prompt: `You are Dusty Martinez, a young trucker who picked up radio operation from your grandfather. You're friendly but easily spooked. You saw something at the tower last month and haven't been the same since. You want to tell someone but you're scared they'll think you're crazy - or worse, that they'll believe you.`,
        speaking_style: "Fast when nervous, lots of 'um' and 'you know'. Trails off when thinking about the tower. Uses trucker slang.",
        background: "22 years old, long-haul trucker. Grew up in this area. Grandfather was a ham radio operator.",
        knowledge: JSON.stringify({
          the_tower: "Saw lights up there. Impossible lights. Moving in patterns.",
          helena: "She's good people. Knew my grandpa. Thinks I know more than I'm saying.",
          marcus: "Only heard stories. Disappeared before I started on the radio."
        }),
        secrets: JSON.stringify([
          "He has a recording of something he captured that night",
          "He's been getting anonymous messages telling him to stay quiet",
          "He knows the frequency the lights seemed to respond to"
        ]),
        relationships: JSON.stringify({
          helena: "Trusts her like family",
          operator_9: "Never talked to them but heard warnings"
        }),
        initial_disposition: 'friendly'
      }
    ];

    for (const char of characters) {
      await query(
        `INSERT INTO characters (id, callsign, display_name, frequency, elevenlabs_voice_id, voice_description,
          personality_prompt, speaking_style, background, knowledge, secrets, relationships, initial_disposition)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (callsign) DO NOTHING`,
        [char.id, char.callsign, char.display_name, char.frequency, char.elevenlabs_voice_id,
         char.voice_description, char.personality_prompt, char.speaking_style, char.background,
         char.knowledge, char.secrets, char.relationships, char.initial_disposition]
      );
    }

    console.log('Seeded characters');

    // Seed signals
    const signals = [
      {
        id: uuidv4(),
        signal_type: 'morse',
        frequency: 29.100,
        content_text: 'THE TOWER REMEMBERS',
        content_encoded: '- .... . / - --- .-- . .-. / .-. . -- . -- -... . .-. ...',
        narrative_trigger: null,
        reward_type: 'info',
        reward_value: 'tower_hint_1'
      },
      {
        id: uuidv4(),
        signal_type: 'numbers',
        frequency: 30.500,
        content_text: '7-3-9-1-4-2-8',
        content_encoded: '7-3-9-1-4-2-8',
        narrative_trigger: 'met_helena',
        reward_type: 'frequency',
        reward_value: '31.777'
      }
    ];

    for (const signal of signals) {
      await query(
        `INSERT INTO signals (id, signal_type, frequency, content_text, content_encoded, narrative_trigger, reward_type, reward_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [signal.id, signal.signal_type, signal.frequency, signal.content_text, signal.content_encoded,
         signal.narrative_trigger, signal.reward_type, signal.reward_value]
      );
    }

    console.log('Seeded signals');

    // Seed frequencies
    const frequencies = [
      { frequency: 27.450, broadcast_type: 'voice', source_type: 'character', label: 'DUSTY', static_level: 0.3 },
      { frequency: 28.200, broadcast_type: 'voice', source_type: 'character', label: 'NIGHTBIRD', static_level: 0.2 },
      { frequency: 29.100, broadcast_type: 'morse', source_type: 'signal', label: 'Unknown Signal', static_level: 0.5 },
      { frequency: 30.500, broadcast_type: 'numbers', source_type: 'signal', label: 'Numbers Station', static_level: 0.6 },
      { frequency: 26.000, broadcast_type: 'static', source_type: null, label: null, static_level: 0.9 },
      { frequency: 27.000, broadcast_type: 'static', source_type: null, label: null, static_level: 0.8 },
      { frequency: 28.000, broadcast_type: 'static', source_type: null, label: null, static_level: 0.85 },
      { frequency: 29.000, broadcast_type: 'static', source_type: null, label: null, static_level: 0.75 },
      { frequency: 30.000, broadcast_type: 'static', source_type: null, label: null, static_level: 0.7 },
    ];

    for (const freq of frequencies) {
      await query(
        `INSERT INTO frequencies (frequency, broadcast_type, source_type, label, static_level)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (frequency) DO NOTHING`,
        [freq.frequency, freq.broadcast_type, freq.source_type, freq.label, freq.static_level]
      );
    }

    console.log('Seeded frequencies');
    console.log('Database seeding completed');

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
