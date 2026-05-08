// Dados simulados do PetCão V2

export const WHATSAPP_NUMBER = '5511986907487';
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

export const PETSHOP_INFO = {
  name: 'PetCão',
  address: 'Av. das Palmeiras, 607 – Portal dos Ipês, Cajamar – SP',
  phone: '(11) 98690-7487',
  whatsapp: WHATSAPP_NUMBER,
  hours: 'Ter - Sáb: 9h às 18h',
  googleMapsUrl: 'https://www.google.com/maps?q=-23.40035863884312,-46.86361300044458',
};

// ============= TIPOS =============

export type UserRole = 'dev' | 'admin' | 'midia' | 'cliente';

export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao';
export type PaymentStatus = 'pago' | 'pendente' | 'nao_cobrado';
export type ModerationStatus = 'pendente' | 'aprovado' | 'rejeitado';
export type AppointmentStatus = 'pendente' | 'confirmado' | 'realizado' | 'cancelado' | 'remarcado';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'banho' | 'tosa' | 'combo';
}

export interface PriceBySize {
  pequeno: number;
  medio: number;
  grande: number;
}

export interface PricingItem {
  id: string;
  name: string;
  description?: string;
  highlight?: boolean;
  prices: PriceBySize;
  features?: string[];
}

export interface PricingCategory {
  id: string;
  name: string;
  description: string;
  items: PricingItem[];
}

export interface Review {
  id: string;
  name: string;
  petName: string;
  rating: number;
  comment: string;
  date: string;
  avatarUrl?: string;
  moderationStatus: ModerationStatus;
  title?: string;
  photos?: string[];
  shopResponse?: string;
  submittedByUserId?: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  alt: string;
  category: 'ambiente' | 'antes-depois' | 'pets' | 'outro' | null;
  moderationStatus: ModerationStatus;
  submittedBy?: string;
  submittedByUserId?: string;
  submittedAt?: string;
  source?: 'CLIENTE' | 'PETSHOP';
  petName?: string;
  ownerName?: string;
  caption?: string;
}

export interface ClientPackage {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  totalBaths: number;
  usedBaths: number;
  includesGrooming: boolean;
  groomingUsed: boolean;
  activatedAt: string;
  active: boolean;
  servicesUsed: { service: string; date: string }[];
}

export type AdminPackageType = 'SEMANAL' | 'QUINZENAL';
export type AdminPackageStatus = 'ATIVO' | 'DESATIVADO';

export interface AdminPackagePet {
  id: string;
  name: string;
  size: string;
  breed: string;
}

export interface AdminPackage {
  id: string;
  tutorPhone: string;
  tutorName: string;
  pet: AdminPackagePet;
  type: AdminPackageType;
  startDate: string;
  status: AdminPackageStatus;
  observation: string;
  createdAt: string;
}

export interface ExtendedAppointment {
  id: string;
  clientId: string;
  clientName: string;
  petId: string;
  petName: string;
  service: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  price: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentAmount?: number;
  completedAt?: string;
  cancelReason?: string;
  petSize?: string;
  petBreed?: string;
  ownerPhone?: string;
  origin?: 'whatsapp' | 'admin' | 'sistema' | 'pacote';
  createdAt?: string;
  lastAction?: string;
}

export interface PackageType {
  id: string;
  name: string;
  description: string;
  totalBaths: number;
  includesGrooming: boolean;
  price: PriceBySize;
}

// ============= SOCIAL LINKS =============

export interface SocialLink {
  key: string;
  label: string;
  url: string;
  enabled: boolean;
}

export const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { key: 'instagram', label: 'Instagram', url: '', enabled: false },
  { key: 'tiktok', label: 'TikTok', url: '', enabled: false },
  { key: 'facebook', label: 'Facebook', url: '', enabled: false },
  { key: 'youtube', label: 'YouTube', url: '', enabled: false },
  { key: 'whatsapp', label: 'WhatsApp', url: `https://wa.me/${WHATSAPP_NUMBER}`, enabled: true },
  { key: 'site', label: 'Site', url: '', enabled: false },
];

// ============= SHOP ADDRESS =============

export interface ShopAddress {
  address: string;
  phone: string;
  whatsapp: string;
}

export const DEFAULT_SHOP_ADDRESS: ShopAddress = {
  address: PETSHOP_INFO.address,
  phone: PETSHOP_INFO.phone,
  whatsapp: WHATSAPP_NUMBER,
};

// ============= DISPLAY LIMITS =============

export interface DisplayLimits {
  maxPhotos: number;
  maxReviews: number;
  moderationPageSizePhotos: number;
  moderationPageSizeReviews: number;
  userUploadPhotoDailyLimit: number;
}

export const DEFAULT_DISPLAY_LIMITS: DisplayLimits = {
  maxPhotos: 10,
  maxReviews: 10,
  moderationPageSizePhotos: 10,
  moderationPageSizeReviews: 10,
  userUploadPhotoDailyLimit: 1,
};

// ============= DADOS MOCK =============

export const services: Service[] = [
  { id: 'banho-simples', name: 'Banho Simples', description: 'Banho com shampoo neutro, secagem e escovação básica.', icon: 'droplets', category: 'banho' },
  { id: 'banho-completo', name: 'Banho Completo', description: 'Banho premium com hidratação, corte de unhas, limpeza de ouvidos e perfume.', icon: 'sparkles', category: 'banho' },
  { id: 'banho-terapeutico', name: 'Banho Terapêutico', description: 'Tratamento especial para pele sensível ou alergias, com produtos específicos.', icon: 'heart', category: 'banho' },
  { id: 'tosa-higienica', name: 'Tosa Higiênica', description: 'Corte nas áreas íntimas, patinhas e ao redor dos olhos.', icon: 'scissors', category: 'tosa' },
  { id: 'tosa-completa', name: 'Tosa Completa', description: 'Corte completo personalizado de acordo com a raça e preferência.', icon: 'scissors', category: 'tosa' },
  { id: 'tosa-verao', name: 'Tosa de Verão', description: 'Corte baixo para os dias quentes, mantendo o pet fresquinho.', icon: 'sun', category: 'tosa' },
];

export const pricingPackages: PricingItem[] = [
  { id: 'quinzenal', name: 'Quinzenal', description: 'Agendamento a cada 15 dias', highlight: true, prices: { pequeno: 90, medio: 110, grande: 140 }, features: ['Banho completo', 'Tosa higiênica', 'Corte de unhas', 'Limpeza de ouvidos', 'Desconto especial'] },
  { id: 'semanal', name: 'Semanal', description: 'Agendamento uma vez por semana', prices: { pequeno: 160, medio: 200, grande: 260 }, features: ['Banho completo', 'Tosa higiênica', 'Corte de unhas', 'Limpeza de ouvidos'] },
];

export const pricingBanhos: PricingItem[] = [
  { id: 'banho-avulso', name: 'Banho', description: 'Banho completo com shampoo, secagem e perfume', prices: { pequeno: 45, medio: 55, grande: 70 }, features: ['Shampoo neutro ou específico', 'Secagem completa', 'Escovação', 'Perfume'] },
];

export const pricingTosas: PricingItem[] = [
  { id: 'tosa-avulsa', name: 'Tosa', description: 'Tosa completa personalizada', prices: { pequeno: 50, medio: 65, grande: 85 }, features: ['Tosa higiênica', 'Corte personalizado', 'Acabamento profissional'] },
];

export const pricingCombo: PricingItem[] = [
  { id: 'combo-banho-tosa', name: 'Banho + Tosa', description: 'Combo completo com desconto especial', highlight: true, prices: { pequeno: 80, medio: 100, grande: 130 }, features: ['Banho completo', 'Tosa personalizada', 'Corte de unhas', 'Limpeza de ouvidos', 'Perfume'] },
];

export const pricingCategories: PricingCategory[] = [
  { id: 'pacotes', name: 'Pacotes', description: 'Planos com desconto para quem agenda regularmente', items: pricingPackages },
  { id: 'banhos', name: 'Banhos', description: 'Serviço de banho individual', items: pricingBanhos },
  { id: 'tosas', name: 'Tosas', description: 'Serviço de tosa individual', items: pricingTosas },
  { id: 'combo', name: 'Banho + Tosa', description: 'Desconto especial no combo', items: pricingCombo },
];

export const reviews: Review[] = [
  { id: '1', name: 'Ana Paula', petName: 'Thor', rating: 5, comment: 'Melhor petshop da região! O Thor sempre volta feliz e cheiroso. Atendimento impecável!', date: '2025-01-15', moderationStatus: 'aprovado', shopResponse: 'Obrigado, Ana! É sempre um prazer receber o Thor! 🐾', photos: ['/placeholder.svg'] },
  { id: '2', name: 'Carlos Eduardo', petName: 'Mel', rating: 5, comment: 'Profissionais muito carinhosos. A Mel que era medrosa agora adora ir ao PetCão!', date: '2025-01-20', moderationStatus: 'aprovado', shopResponse: 'Ficamos felizes! A Mel é super especial para nós! 💛' },
  { id: '3', name: 'Fernanda Lima', petName: 'Bob', rating: 5, comment: 'Preço justo, qualidade excelente. Recomendo de olhos fechados!', date: '2025-01-28', moderationStatus: 'aprovado', photos: ['/placeholder.svg'] },
  { id: '4', name: 'Ricardo Souza', petName: 'Nina', rating: 4, comment: 'Ótimo atendimento e ambiente limpo. A Nina ficou linda após a tosa!', date: '2025-02-01', moderationStatus: 'aprovado', shopResponse: 'Que alegria, Ricardo! A Nina é uma gracinha!' },
  { id: '5', name: 'Bianca Rocha', petName: 'Coco', rating: 5, comment: 'Simplesmente perfeito! Meu Coco voltou cheirando e super animado.', date: '2025-02-08', moderationStatus: 'aprovado' },
  { id: '6', name: 'Leandro Martins', petName: 'Freddy', rating: 5, comment: 'Equipe muito atenciosa, ambientes limpos e preço acessível. Voltarei sempre!', date: '2025-02-14', moderationStatus: 'aprovado', shopResponse: 'Obrigado, Leandro! O Freddy é nosso grandão favorito! 🐕' },
  { id: '7', name: 'Juliana Costa', petName: 'Max', rating: 5, comment: 'Excelente! O Max sempre fica lindo.', date: '2025-02-18', moderationStatus: 'pendente' },
  { id: '8', name: 'Pedro Alves', petName: 'Bella', rating: 3, comment: 'Bom serviço, mas demorou um pouco mais do que o esperado.', date: '2025-02-19', moderationStatus: 'pendente', photos: ['/placeholder.svg'] },
  { id: '9', name: 'Sandra Oliveira', petName: 'Pingo', rating: 4, comment: 'Gostei muito do atendimento, vou recomendar!', date: '2025-02-20', moderationStatus: 'pendente' },
  { id: '10', name: 'Diego Ferreira', petName: 'Toby', rating: 5, comment: 'Incrível! Meu cachorro voltou todo bem tratado.', date: '2025-02-20', moderationStatus: 'pendente' },
  { id: '11', name: 'Patrícia Nunes', petName: 'Luna', rating: 2, comment: 'Achei o atendimento um pouco demorado. Esperaria por mais agilidade.', date: '2025-01-10', moderationStatus: 'rejeitado' },
  { id: '12', name: 'Marcos Vinicius', petName: 'Rex', rating: 1, comment: 'Não fiquei satisfeito com o resultado da tosa.', date: '2025-01-05', moderationStatus: 'rejeitado' },
];

export const galleryImages: GalleryImage[] = [
  { id: '1', url: '/placeholder.svg', alt: 'Pet feliz após banho', category: 'pets', moderationStatus: 'aprovado', source: 'PETSHOP', petName: 'Thor', caption: 'Thor pós-banho completo' },
  { id: '2', url: '/placeholder.svg', alt: 'Ambiente do petshop', category: 'ambiente', moderationStatus: 'aprovado', source: 'PETSHOP', caption: 'Recepção do PetCão' },
  { id: '3', url: '/placeholder.svg', alt: 'Antes e depois da tosa', category: 'antes-depois', moderationStatus: 'aprovado', source: 'PETSHOP', petName: 'Mel', caption: 'Transformação da Mel' },
  { id: '4', url: '/placeholder.svg', alt: 'Golden Retriever sorrindo', category: 'pets', moderationStatus: 'aprovado', source: 'PETSHOP', petName: 'Bob', caption: 'Bob pronto para o verão!' },
  { id: '5', url: '/placeholder.svg', alt: 'Área de banho', category: 'ambiente', moderationStatus: 'aprovado', source: 'PETSHOP', caption: 'Área de banho higienizada' },
  { id: '6', url: '/placeholder.svg', alt: 'Poodle após tosa', category: 'antes-depois', moderationStatus: 'aprovado', source: 'PETSHOP', petName: 'Nina', caption: 'Nina linda após tosa' },
  { id: '7', url: '/placeholder.svg', alt: 'Labrador brincando', category: null, moderationStatus: 'pendente', source: 'CLIENTE', submittedBy: 'Ana Paula', submittedAt: '2025-02-10', petName: 'Thor', ownerName: 'Ana Paula' },
  { id: '8', url: '/placeholder.svg', alt: 'Sala de espera', category: null, moderationStatus: 'pendente', source: 'CLIENTE', submittedBy: 'Carlos Eduardo', submittedAt: '2025-02-11', ownerName: 'Carlos Eduardo' },
  { id: '9', url: '/placeholder.svg', alt: 'Cachorro fofo após banho', category: null, moderationStatus: 'pendente', source: 'CLIENTE', submittedBy: 'Fernanda Lima', submittedAt: '2025-02-15', petName: 'Bob', ownerName: 'Fernanda Lima' },
  { id: '10', url: '/placeholder.svg', alt: 'Spitz alemão tosado', category: null, moderationStatus: 'pendente', source: 'CLIENTE', submittedBy: 'Ricardo Souza', submittedAt: '2025-02-18', petName: 'Nina', ownerName: 'Ricardo Souza' },
  { id: '11', url: '/placeholder.svg', alt: 'Foto recusada qualidade baixa', category: null, moderationStatus: 'rejeitado', source: 'CLIENTE', submittedBy: 'Pedro Alves', submittedAt: '2025-02-05', petName: 'Bella', ownerName: 'Pedro Alves' },
  { id: '12', url: '/placeholder.svg', alt: 'Foto fora do tema', category: null, moderationStatus: 'rejeitado', source: 'CLIENTE', submittedBy: 'Juliana Costa', submittedAt: '2025-02-01', ownerName: 'Juliana Costa' },
];

export const availableTimeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

// Admin users removed — authentication is handled by Supabase Auth + user_roles table
export const adminUsers: AdminUser[] = [];

// ============= MOCK APPOINTMENTS (ADMIN VIEW) =============

const today = new Date();
const fmtDate = (daysOffset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

export const mockAllAppointments: ExtendedAppointment[] = [
  // Concluídos HOJE (receita hoje)
  { id: 'apt1', clientId: 'user1', clientName: 'João Silva', petId: 'pet1', petName: 'Rex', service: 'Banho Completo', date: fmtDate(0), time: '09:00', status: 'realizado', price: 70, paymentStatus: 'pago', paymentMethod: 'pix', paymentAmount: 70, completedAt: fmtDate(0), ownerPhone: '11999991111' },
  { id: 'apt2', clientId: 'user2', clientName: 'Ana Paula', petId: 'pet2', petName: 'Thor', service: 'Banho + Tosa', date: fmtDate(0), time: '10:30', status: 'realizado', price: 100, paymentStatus: 'pago', paymentMethod: 'cartao', paymentAmount: 100, completedAt: fmtDate(0), ownerPhone: '11999992222' },

  // Concluídos esta semana (receita recente)
  { id: 'apt3', clientId: 'user3', clientName: 'Carlos Eduardo', petId: 'pet3', petName: 'Mel', service: 'Tosa Completa', date: fmtDate(-1), time: '14:00', status: 'realizado', price: 85, paymentStatus: 'pago', paymentMethod: 'dinheiro', paymentAmount: 85, completedAt: fmtDate(-1), ownerPhone: '11999998888' },
  { id: 'apt4', clientId: 'user4', clientName: 'Fernanda Lima', petId: 'pet4', petName: 'Bob', service: 'Banho Completo', date: fmtDate(-2), time: '11:00', status: 'realizado', price: 70, paymentStatus: 'pago', paymentMethod: 'pix', paymentAmount: 70, completedAt: fmtDate(-2), ownerPhone: '11999993333' },
  { id: 'apt5', clientId: 'user5', clientName: 'Ricardo Souza', petId: 'pet5', petName: 'Nina', service: 'Banho Terapêutico', date: fmtDate(-3), time: '08:30', status: 'realizado', price: 90, paymentStatus: 'pago', paymentMethod: 'cartao', paymentAmount: 90, completedAt: fmtDate(-3), ownerPhone: '11999994444' },

  // Concluídos mês atual (pagamento pendente)
  { id: 'apt6', clientId: 'user6', clientName: 'Bianca Rocha', petId: 'pet6', petName: 'Coco', service: 'Banho Simples', date: fmtDate(-4), time: '15:00', status: 'realizado', price: 55, paymentStatus: 'pendente', completedAt: fmtDate(-4), ownerPhone: '11999995555' },
  { id: 'apt7', clientId: 'user7', clientName: 'Leandro Martins', petId: 'pet7', petName: 'Freddy', service: 'Tosa Completa', date: fmtDate(-5), time: '13:00', status: 'realizado', price: 85, paymentStatus: 'pendente', completedAt: fmtDate(-5), ownerPhone: '11999996666' },

  // Concluídos mês atual (pagos, mais antigos)
  { id: 'apt8', clientId: 'tutor-vitorhugo', clientName: 'Vitor Hugo', petId: 'pet-maju', petName: 'Maju', service: 'Banho Completo', date: fmtDate(-7), time: '10:00', status: 'realizado', price: 45, paymentStatus: 'pago', paymentMethod: 'pix', paymentAmount: 45, completedAt: fmtDate(-7), ownerPhone: '11986907487' },
  { id: 'apt9', clientId: 'user1', clientName: 'João Silva', petId: 'pet1', petName: 'Rex', service: 'Tosa Higiênica', date: fmtDate(-10), time: '14:00', status: 'realizado', price: 50, paymentStatus: 'pago', paymentMethod: 'dinheiro', paymentAmount: 50, completedAt: fmtDate(-10), ownerPhone: '11999991111' },
  { id: 'apt10', clientId: 'user2', clientName: 'Ana Paula', petId: 'pet2', petName: 'Thor', service: 'Banho Simples', date: fmtDate(-14), time: '09:00', status: 'realizado', price: 55, paymentStatus: 'pago', paymentMethod: 'cartao', paymentAmount: 55, completedAt: fmtDate(-14), ownerPhone: '11999992222' },

  // Pendentes (futuros)
  { id: 'apt11', clientId: 'user3', clientName: 'Carlos Eduardo', petId: 'pet3', petName: 'Mel', service: 'Banho Simples', date: fmtDate(1), time: '11:00', status: 'pendente', price: 55, paymentStatus: 'nao_cobrado', ownerPhone: '11999998888' },
  { id: 'apt12', clientId: 'user6', clientName: 'Bianca Rocha', petId: 'pet6', petName: 'Coco', service: 'Banho Completo', date: fmtDate(4), time: '09:30', status: 'pendente', price: 70, paymentStatus: 'nao_cobrado', ownerPhone: '11999995555' },
  { id: 'apt13', clientId: 'tutor-vitorhugo', clientName: 'Vitor Hugo', petId: 'pet-maju', petName: 'Maju', service: 'Banho Completo', date: fmtDate(3), time: '10:00', status: 'pendente', price: 45, paymentStatus: 'nao_cobrado', ownerPhone: '11986907487', origin: 'whatsapp', createdAt: new Date().toISOString() },

  // Confirmados (futuros)
  { id: 'apt14', clientId: 'tutor-vitorhugo', clientName: 'Vitor Hugo', petId: 'pet-thor-vh', petName: 'Thor', service: 'Tosa Completa', date: fmtDate(7), time: '14:00', status: 'confirmado', price: 65, paymentStatus: 'nao_cobrado', ownerPhone: '11986907487' },
  { id: 'apt15', clientId: 'user1', clientName: 'João Silva', petId: 'pet1', petName: 'Rex', service: 'Banho + Tosa', date: fmtDate(2), time: '14:00', status: 'confirmado', price: 100, paymentStatus: 'nao_cobrado', ownerPhone: '11999991111' },

  // Cancelado
  { id: 'apt16', clientId: 'user4', clientName: 'Fernanda Lima', petId: 'pet4', petName: 'Bob', service: 'Tosa Completa', date: fmtDate(-5), time: '15:00', status: 'cancelado', price: 65, paymentStatus: 'nao_cobrado', cancelReason: 'Pet ficou doente', ownerPhone: '11999993333' },
  { id: 'apt17', clientId: 'tutor-vitorhugo', clientName: 'Vitor Hugo', petId: 'pet-thor-vh', petName: 'Thor', service: 'Banho Simples', date: fmtDate(-20), time: '11:00', status: 'cancelado', price: 45, paymentStatus: 'nao_cobrado', cancelReason: 'Pet indisposto', ownerPhone: '11986907487' },

  // Remarcado
  { id: 'apt18', clientId: 'user3', clientName: 'Carlos Eduardo', petId: 'pet3', petName: 'Mel', service: 'Banho + Tosa', date: fmtDate(5), time: '14:00', status: 'remarcado', price: 100, paymentStatus: 'nao_cobrado', ownerPhone: '11999998888' },
];

// ============= MOCK PACKAGES =============

export const packageTypes: PackageType[] = [
  { id: 'pkg-semanal', name: 'Pacote Semanal', description: '4 banhos semanais', totalBaths: 4, includesGrooming: false, price: { pequeno: 160, medio: 200, grande: 260 } },
  { id: 'pkg-quinzenal', name: 'Pacote Quinzenal', description: '2 banhos quinzenais', totalBaths: 2, includesGrooming: true, price: { pequeno: 90, medio: 110, grande: 140 } },
  { id: 'pkg-banho-tosa', name: 'Banho + Tosa Semanal', description: '4 banhos + 1 tosa', totalBaths: 4, includesGrooming: true, price: { pequeno: 220, medio: 280, grande: 360 } },
];

export const mockClientPackages: ClientPackage[] = [
  {
    id: 'cpkg1', clientId: 'user1', clientName: 'João Silva', type: 'Pacote Semanal',
    totalBaths: 4, usedBaths: 2, includesGrooming: false, groomingUsed: false,
    activatedAt: '2025-02-01', active: true,
    servicesUsed: [
      { service: 'Banho Completo', date: '2025-02-05' },
      { service: 'Banho Simples', date: '2025-02-10' },
    ],
  },
  {
    id: 'cpkg2', clientId: 'user2', clientName: 'Ana Paula', type: 'Banho + Tosa Semanal',
    totalBaths: 4, usedBaths: 1, includesGrooming: true, groomingUsed: false,
    activatedAt: '2025-02-01', active: true,
    servicesUsed: [
      { service: 'Banho + Tosa', date: '2025-02-12' },
    ],
  },
];

// ============= MOCK ADMIN PACKAGES (V2) =============

export const mockAdminPackages: AdminPackage[] = [
  {
    id: 'apkg1',
    tutorPhone: '11999998888',
    tutorName: 'Carlos Eduardo',
    pet: { id: 'pet-carlos-mel', name: 'Mel', size: 'Médio', breed: 'Golden Retriever' },
    type: 'SEMANAL',
    startDate: new Date().toISOString().split('T')[0],
    status: 'ATIVO',
    observation: '',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'apkg2',
    tutorPhone: '11986907487',
    tutorName: 'Vitor Hugo',
    pet: { id: 'pet-maju', name: 'Maju', size: 'Pequeno', breed: 'SRD' },
    type: 'QUINZENAL',
    startDate: new Date().toISOString().split('T')[0],
    status: 'ATIVO',
    observation: '',
    createdAt: new Date().toISOString(),
  },
];

// ============= MOCK TUTOR FOR TESTING =============

export interface MockTutor {
  id: string;
  name: string;
  phone: string;
  email: string;
  pets: AdminPackagePet[];
}

export const mockTutors: MockTutor[] = [
  {
    id: 'tutor-carlos',
    name: 'Carlos Eduardo',
    phone: '11999998888',
    email: 'carlos.teste@petcao.com',
    pets: [
      { id: 'pet-carlos-mel', name: 'Mel', size: 'Médio', breed: 'Golden Retriever' },
      { id: 'pet-carlos-thor', name: 'Thor', size: 'Pequeno', breed: 'Spitz Alemão' },
    ],
  },
  {
    id: 'tutor-vitorhugo',
    name: 'Vitor Hugo',
    phone: '11986907487',
    email: 'vitorhugo@petcao.com',
    pets: [
      { id: 'pet-maju', name: 'Maju', size: 'Pequeno', breed: 'SRD' },
      { id: 'pet-bolt', name: 'Bolt', size: 'Médio', breed: 'Labrador' },
    ],
  },
  {
    id: 'tutor-ana',
    name: 'Ana Paula',
    phone: '11999992222',
    email: 'ana.paula@email.com',
    pets: [
      { id: 'pet2', name: 'Thor', size: 'Grande', breed: 'Labrador' },
    ],
  },
  {
    id: 'tutor-fernanda',
    name: 'Fernanda Lima',
    phone: '11999993333',
    email: 'fernanda@email.com',
    pets: [
      { id: 'pet4', name: 'Bob', size: 'Médio', breed: 'Poodle' },
    ],
  },
  {
    id: 'tutor-ricardo',
    name: 'Ricardo Souza',
    phone: '11999994444',
    email: 'ricardo@email.com',
    pets: [
      { id: 'pet5', name: 'Nina', size: 'Pequeno', breed: 'Spitz Alemão' },
    ],
  },
  {
    id: 'tutor-bianca',
    name: 'Bianca Rocha',
    phone: '11999995555',
    email: '',
    pets: [
      { id: 'pet6', name: 'Coco', size: 'Pequeno', breed: 'Yorkshire' },
      { id: 'pet6b', name: 'Nala', size: 'Médio', breed: 'Shih Tzu' },
    ],
  },
  {
    id: 'tutor-leandro',
    name: 'Leandro Martins',
    phone: '11999996666',
    email: '',
    pets: [
      { id: 'pet7', name: 'Freddy', size: 'Grande', breed: 'Rottweiler' },
    ],
  },
  // Inactive client (old appointment >60 days ago, now only in apt1 = 60 days ago for João)
  {
    id: 'tutor-joao',
    name: 'João Silva',
    phone: '11999991111',
    email: 'joao@email.com',
    pets: [
      { id: 'pet1', name: 'Rex', size: 'Grande', breed: 'Golden Retriever' },
    ],
  },
];

// ============= DASHBOARD DATA =============

export interface DashboardMetrics {
  totalRevenue: number;
  totalServices: number;
  byPaymentMethod: { method: PaymentMethod; total: number; count: number }[];
  completedServices: ExtendedAppointment[];
  revenueByDay: { date: string; revenue: number }[];
}

export function getDashboardData(period: 'hoje' | 'semana' | 'mes'): DashboardMetrics {
  const completed = mockAllAppointments.filter(a => a.status === 'realizado' && a.paymentStatus === 'pago');
  
  const totalRevenue = completed.reduce((sum, a) => sum + (a.paymentAmount || 0), 0);
  const totalServices = completed.length;

  const byMethod: Record<PaymentMethod, { total: number; count: number }> = {
    pix: { total: 0, count: 0 },
    dinheiro: { total: 0, count: 0 },
    cartao: { total: 0, count: 0 },
  };

  completed.forEach(a => {
    if (a.paymentMethod) {
      byMethod[a.paymentMethod].total += a.paymentAmount || 0;
      byMethod[a.paymentMethod].count += 1;
    }
  });

  const byPaymentMethod = Object.entries(byMethod).map(([method, data]) => ({
    method: method as PaymentMethod,
    ...data,
  }));

  const revenueByDay = [
    { date: '08/02', revenue: 70 },
    { date: '09/02', revenue: 70 },
    { date: '10/02', revenue: 70 },
    { date: '11/02', revenue: 85 },
    { date: '12/02', revenue: 100 },
    { date: '13/02', revenue: 0 },
    { date: '14/02', revenue: 55 },
  ];

  const multiplier = period === 'hoje' ? 0.3 : period === 'semana' ? 1 : 4;

  return {
    totalRevenue: Math.round(totalRevenue * multiplier),
    totalServices: Math.round(totalServices * multiplier),
    byPaymentMethod: byPaymentMethod.map(m => ({
      ...m,
      total: Math.round(m.total * multiplier),
      count: Math.round(m.count * multiplier),
    })),
    completedServices: completed,
    revenueByDay,
  };
}

// ============= CLOSED DAYS =============

export const mockClosedDays: string[] = [];

// ============= HELPERS =============

export function generateWhatsAppMessage(data: {
  service?: string;
  date?: string;
  time?: string;
  petName?: string;
  petNames?: string;
  ownerName?: string;
  ownerPhone?: string;
  action?: 'agendar' | 'alterar' | 'cancelar';
  cancelReason?: string;
}): string {
  const { service, date, time, petName, petNames, ownerName, ownerPhone, action = 'agendar', cancelReason } = data;
  const petsLabel = petNames || petName || 'Meu pet';
  let message = '';

  switch (action) {
    case 'agendar':
      message = `Olá! 🐕 Gostaria de agendar um serviço no PetCão.\n\n`;
      if (service) message += `📋 Serviço: ${service}\n`;
      message += `🐾 Pets: ${petsLabel}\n`;
      if (ownerName) message += `👤 Responsável: ${ownerName}\n`;
      if (ownerPhone) message += `📞 Telefone: ${ownerPhone}\n`;
      if (date) message += `📅 Data: ${date}\n`;
      if (time) message += `⏰ Horário: ${time}\n`;
      message += `\nAguardo confirmação. Obrigado!`;
      break;
    case 'alterar':
      message = `Olá! 🐕 Preciso alterar meu agendamento no PetCão.\n\n`;
      message += `🐾 Pet: ${petsLabel}\n`;
      if (date) message += `📅 Data atual: ${date}\n`;
      if (time) message += `⏰ Horário atual: ${time}\n`;
      message += `\nQual nova data/horário disponível?`;
      break;
    case 'cancelar':
      message = `Olá! 🐕 Preciso cancelar meu agendamento no PetCão.\n\n`;
      message += `🐾 Pet: ${petsLabel}\n`;
      if (date) message += `📅 Data: ${date}\n`;
      if (time) message += `⏰ Horário: ${time}\n`;
      if (cancelReason) message += `❌ Motivo: ${cancelReason}\n`;
      message += `\nObrigado pela compreensão.`;
      break;
  }

  return encodeURIComponent(message);
}

export function getWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
}
