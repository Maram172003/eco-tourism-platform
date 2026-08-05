import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Answer,
  Question,
  Questionnaire,
  QuestionnaireAttempt,
  UserAnswer,
} from './entities/questionnaire.entities';
import { SubmitQuestionnaireDto } from './dto/submit-questionnaire.dto';
import { EcoTravelerService } from '../eco-traveler/eco-traveler.service';
import { GuideService } from '../guide/guide.service';
import { ProviderService } from '../provider/provider.service';

@Injectable()
export class QuestionnaireService {
  constructor(
    @InjectRepository(Questionnaire)
    private readonly questionnaireRepo: Repository<Questionnaire>,
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
    @InjectRepository(Answer)
    private readonly answerRepo: Repository<Answer>,
    @InjectRepository(QuestionnaireAttempt)
    private readonly attemptRepo: Repository<QuestionnaireAttempt>,
    @InjectRepository(UserAnswer)
    private readonly userAnswerRepo: Repository<UserAnswer>,
    private readonly ecoTravelerService: EcoTravelerService,
    private readonly guideService: GuideService,
    private readonly providerService: ProviderService,
  ) {}

  async getActiveQuestionnaire(targetType = 'eco_traveler') {
    const questionnaire = await this.questionnaireRepo.findOne({
      where: { target_type: targetType, is_active: true },
      relations: ['questions', 'questions.answers', 'questions.category'],
      order: { questions: { question_order: 'ASC' } },
    });

    if (!questionnaire) {
      throw new NotFoundException('Aucun questionnaire actif trouvé.');
    }

    return questionnaire;
  }

  async getMyLatestAttempt(userId: string) {
    return await this.attemptRepo.findOne({
      where: { user_id: userId },
      order: { completed_at: 'DESC' },
      relations: ['user_answers'],
    });
  }

  async submit(userId: string, dto: SubmitQuestionnaireDto) {
    // 1. Vérifier que le questionnaire existe
    const questionnaire = await this.questionnaireRepo.findOne({
      where: { id: dto.questionnaire_id },
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionnaire introuvable.');
    }

    // Vérifier si l'utilisateur a déjà soumis ce questionnaire
    const existingAttempt = await this.attemptRepo.findOne({
      where: { user_id: userId, questionnaire_id: dto.questionnaire_id },
    });
    if (existingAttempt) {
      throw new BadRequestException('Vous avez déjà complété ce questionnaire.');
    }

    // 2. Charger toutes les réponses en une seule requête
    const answerIds = dto.answers.map((a) => a.answer_id);
    const answers = await this.answerRepo.findByIds(answerIds);
    const answerMap = new Map(answers.map((a) => [a.id, a]));

    // 3. Charger toutes les questions pour connaître leur catégorie
    const questionIds = dto.answers.map((a) => a.question_id);
    const questions = await this.questionRepo.find({
      where: questionIds.map((id) => ({ id })),
      relations: ['category'],
    });
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // 4. Créer la tentative
    const attempt = this.attemptRepo.create({
      user_id: userId,
      questionnaire_id: dto.questionnaire_id,
      completed_at: new Date(),
    });

    const savedAttempt = await this.attemptRepo.save(attempt);

    // 5. Calculer les scores par catégorie
    let totalScore = 0;
    let envScore = 0;
    let envCount = 0;
    let socialScore = 0;
    let socialCount = 0;
    let economicScore = 0;
    let economicCount = 0;

    const userAnswers: UserAnswer[] = [];

    for (const input of dto.answers) {
      const answer = answerMap.get(input.answer_id);
      if (!answer) continue;

      const question = questionMap.get(input.question_id);
      const categoryName = question?.category?.name ?? 'environmental';

      totalScore += answer.score;

      if (categoryName === 'environmental') {
        envScore += answer.score;
        envCount++;
      } else if (categoryName === 'social') {
        socialScore += answer.score;
        socialCount++;
      } else if (categoryName === 'economic') {
        economicScore += answer.score;
        economicCount++;
      }

      const ua = this.userAnswerRepo.create({
        attempt_id: savedAttempt.id,
        question_id: input.question_id,
        answer_id: input.answer_id,
        score: answer.score,
      });

      userAnswers.push(ua);
    }

    // 6. Sauvegarder les réponses utilisateur
    await this.userAnswerRepo.save(userAnswers);

    // 7. Calculer les pourcentages
    const maxScore = dto.answers.length * 4;
    const percentage = Math.round((totalScore / maxScore) * 100);

    savedAttempt.score_total = totalScore;
    savedAttempt.score_percentage = percentage;
    savedAttempt.environmental_score = envCount
      ? Math.round((envScore / (envCount * 4)) * 100)
      : 0;
    savedAttempt.social_score = socialCount
      ? Math.round((socialScore / (socialCount * 4)) * 100)
      : 0;
    savedAttempt.economic_score = economicCount
      ? Math.round((economicScore / (economicCount * 4)) * 100)
      : 0;

    await this.attemptRepo.save(savedAttempt);

    // 8. Mettre à jour le composant questionnaire selon le rôle
    if (questionnaire.target_type === 'eco_traveler') {
      await this.ecoTravelerService.updateQuestionnaireScore(userId, percentage);
    } else if (questionnaire.target_type === 'guide') {
      await this.guideService.updateQuestionnaireScore(userId, percentage);
    } else if (questionnaire.target_type === 'provider') {
      await this.providerService.updateQuestionnaireScore(userId, percentage);
    }

    return {
      attempt_id: savedAttempt.id,
      score_total: totalScore,
      score_percentage: percentage,
      environmental_score: savedAttempt.environmental_score,
      social_score: savedAttempt.social_score,
      economic_score: savedAttempt.economic_score,
      profile: this.getScoreProfile(percentage),
      message: this.getScoreMessage(percentage),
    };
  }

  getScoreProfile(score: number) {
    if (score >= 80) return 'Ambassadeur durable';
    if (score >= 60) return 'Écovoyageur engagé';
    if (score >= 40) return 'Voyageur sensible';
    return 'Voyageur classique';
  }

  getScoreMessage(score: number) {
    if (score >= 80)
      return 'Félicitations ! Vous êtes un vrai ambassadeur du voyage durable.';
    if (score >= 60)
      return 'Très bien ! Vous êtes un écovoyageur engagé. Continuez dans cette voie !';
    if (score >= 40)
      return 'Bon début ! Vous êtes sensible aux enjeux du tourisme responsable.';
    return 'Bienvenue ! La plateforme vous aidera à adopter des pratiques plus durables.';
  }
}