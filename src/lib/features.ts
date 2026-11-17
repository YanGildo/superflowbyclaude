// Módulos ligados/desligados. O Telegram fica escondido até a segunda etapa (o código e o banco continuam prontos).
// "pessoal" (TikTok Shop, Treino, Veículos) liga depois que a migração 20261117000000 estiver no banco.
export const FEATURES = { telegram: false, pessoal: false } as const;
