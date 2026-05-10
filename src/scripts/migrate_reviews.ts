
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rphhgpcuzkdnytsjjcjo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CqSqvqBHjglAdf0bLyPkyw_amvx7y9u';
const PETSHOP_ID = '33333333-3333-3333-3333-333333333333'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const legacyReviews = [
  {
    name: "Dra. Luciana Silva",
    pet_name: "Luna",
    rating: 5,
    comment: "O cuidado com a Luna é excepcional! Desde que começamos o cronograma de banhos, a pelagem dela nunca esteve tão bonita. Equipe super atenciosa.",
    moderation_status: "aprovado"
  },
  {
    name: "Carlos Alberto",
    pet_name: "Thor",
    rating: 5,
    comment: "Melhor petshop da região! O Thor adora vir aqui, ele fica super tranquilo. O serviço de leva e traz é pontual e muito prático para o meu dia a dia.",
    moderation_status: "aprovado"
  },
  {
    name: "Mariana Costa",
    pet_name: "Bento",
    rating: 4,
    comment: "Ambiente muito limpo e profissionais que realmente amam o que fazem. O Bento sempre volta cheiroso e feliz. Recomendo de olhos fechados!",
    moderation_status: "aprovado"
  },
  {
    name: "Roberto Almeida",
    pet_name: "Mel",
    rating: 5,
    comment: "Atendimento nota 10! As instalações são modernas e o sistema de agendamento online facilita muito. Parabéns pela organização.",
    moderation_status: "aprovado"
  }
];

async function migrate() {
  console.log('Iniciando migração de avaliações...');
  
  for (const review of legacyReviews) {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        ...review,
        petshop_id: PETSHOP_ID,
        title: 'Avaliação Verificada'
      })
      .select()
      .single();
      
    if (error) {
      console.error(`Erro ao inserir avaliação de ${review.name}:`, error.message);
    } else {
      console.log(`Sucesso: Avaliação de ${review.name} (ID: ${data.id}) inserida.`);
    }
  }
  
  console.log('Migração concluída!');
}

migrate();
