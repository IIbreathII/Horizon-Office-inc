import { NotFound } from '../../common/errors.js';
import { levelProgress } from '../claims/level.js';
import { profilesRepository as repo } from './profiles.repository.js';

export const profilesService = {
  /**
   * Профиль, баланс и опыт текущего пользователя; organization — если у него есть профиль организации.
   * Уровень и прогресс считаются здесь по xp, чтобы фронт показывал то же, что начисляет бэкенд.
   */
  async getMe(userId: number) {
    const [user, organization] = await Promise.all([repo.findUser(userId), repo.findOrganization(userId)]);
    if (!user) throw new NotFound('User not found');
    const { level, current, required } = levelProgress(user.xp);
    return { ...user, curLevel: level, levelProgress: { current, required }, organization };
  },

  inventory(userId: number) {
    return repo.inventory(userId);
  },

  /** Квесты, на которые пользователь подавал заявку, в любом статусе; claim — его заявка. Отозванные не входят. */
  async myQuests(userId: number) {
    const claims = await repo.myClaims(userId);
    return claims.map(({ quest, ...claim }) => ({ ...quest, claim }));
  },
};
