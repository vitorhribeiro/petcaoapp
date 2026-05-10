
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const PETSHOP_ID = 'a0000000-0000-0000-0000-000000000001';

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase env vars missing!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const VERIFIED_REVIEWS = [
  {
    petshop_id: PETSHOP_ID,
    name: 'Gabriele Tiemi',
    pet_name: 'Maju',
    rating: 5,
    comment: 'O PetCão é maravilhoso! A Maju sempre volta super cheirosa e relaxada. O cuidado deles é impecável, sinto muita segurança em deixar minha pequena lá.',
    moderation_status: 'aprovado',
  },
  {
    petshop_id: PETSHOP_ID,
    name: 'Daniele Kaori',
    pet_name: 'Canela, Gamora e Cacau',
    rating: 5,
    comment: 'Sempre levo minhas três meninas e o atendimento é nota 10. Equipe atenciosa, pontual e que realmente ama os animais. Recomendo de olhos fechados!',
    moderation_status: 'aprovado',
  },
  {
    petshop_id: PETSHOP_ID,
    name: 'Lucas Vinicius',
    pet_name: 'Ralf e Lara',
    rating: 5,
    comment: 'O Ralf e a Lara adoram o dia de banho no PetCão. Profissionais excelentes que tratam nossos pets como se fossem deles. Melhor pet shop da região!',
    moderation_status: 'aprovado',
  },
  {
    petshop_id: PETSHOP_ID,
    name: 'Lucianinha',
    pet_name: 'Max',
    rating: 5,
    comment: 'O Max fica todo feliz quando chegamos no PetCão. O serviço é de altíssima qualidade e o carinho com que tratam ele é emocionante. Nota mil!',
    moderation_status: 'aprovado',
  }
];

async function seed() {
  console.log('Inserindo avaliações verificadas...');
  const { data, error } = await supabase.from('reviews').insert(VERIFIED_REVIEWS);
  if (error) {
    console.error('Erro ao inserir:', error);
  } else {
    console.log('Avaliações inseridas com sucesso!');
  }
}

seed();
