import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { randomBytes } from 'crypto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { UserStatus } from '../common/enums/user-status.enum';
import { Role } from '../common/enums/roles.enum';



@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly mailService: MailService,
        private readonly jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        const existingUser = await this.usersService.findByEmail(dto.email);

        if (existingUser) {
            throw new BadRequestException('Email already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.usersService.create({
            email: dto.email,
            password: hashedPassword,
            role: dto.role,
        });

        const verificationToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

        await this.usersService.saveVerificationToken(
            user.id,
            verificationToken,
            expiresAt,
        );

        try {
            await this.mailService.sendVerificationEmail(user.email, verificationToken);
        } catch (error) {
            console.warn('Failed to send verification email:', error.message);
        }

        return {
            message: 'User created. Verification email sent.',
        };
    }

    async verifyEmail(token: string) {

        const user = await this.usersService.activateUserByToken(token);

        if (!user) {
            throw new NotFoundException('Invalid verification token');
        }

        const accessToken = await this.generateAccessToken(user);

        const refreshToken = this.generateRefreshToken();
        const refreshExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

        await this.usersService.saveRefreshToken(
            user.id,
            refreshToken,
            refreshExpiresAt,
        );

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user,
            dashboard: this.getDashboardPathByRole(user.role),
        };
    }

    async generateAccessToken(user: any) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        const tokenValue = await this.jwtService.signAsync(payload);

        return tokenValue;
    }

    generateRefreshToken() {
        return randomBytes(64).toString('hex');
    }

    async login(dto: LoginDto) {
        const user = await this.usersService.findByEmail(dto.email);

        if (!user) {
            throw new UnauthorizedException('Email ou mot de passe incorrect.');
        }

        // Anti brute force : si le compte est verrouillé (5 échecs → 15 min de lockout)
        if (user.locked_until && new Date() < new Date(user.locked_until)) {
            const remaining = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 1000 / 60);
            throw new UnauthorizedException(`Compte temporairement verrouillé. Réessayez dans ${remaining} minute(s).`);
        }

        const passwordMatch = await bcrypt.compare(dto.password, user.password);

        if (!passwordMatch) {
            // Anti brute force : incrémente le compteur d'échecs → lockout si ≥ 5
            await this.usersService.incrementFailedLoginAttempts(user.id);
            throw new UnauthorizedException('Email ou mot de passe incorrect.');
        }

        // Anti brute force : login réussi → réinitialisation du compteur d'échecs
        await this.usersService.resetFailedLoginAttempts(user.id);

        if (user.status === UserStatus.BANNED) {
            // Auto-unban if temporary ban expired
            if (user.ban_until && new Date() > new Date(user.ban_until)) {
                await this.usersService.unban(user.id);
            } else {
                const banMsg = user.ban_until
                    ? `Votre compte est suspendu jusqu'au ${new Date(user.ban_until).toLocaleDateString('fr-FR')} à ${new Date(user.ban_until).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`
                    : 'Votre compte a été suspendu définitivement suite à une violation de nos conditions d\'utilisation.';
                throw new UnauthorizedException(banMsg);
            }
        }

        if (!user.email_verified_at || user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Email non vérifié. Vérifiez votre boîte de réception.');
        }

        const accessToken = await this.generateAccessToken(user);

        const refreshToken = this.generateRefreshToken();
        const refreshExpiresAt = new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7,
        );

        await this.usersService.saveRefreshToken(
            user.id,
            refreshToken,
            refreshExpiresAt,
        );

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user,
            dashboard: this.getDashboardPathByRole(user.role),
        };
    }

    async refresh(dto: RefreshTokenDto) {
        const user = await this.usersService.validateRefreshToken(dto.refresh_token);

        const newAccessToken = await this.generateAccessToken(user);

        const newRefreshToken = this.generateRefreshToken();
        const newRefreshExpiresAt = new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7,
        );

        await this.usersService.saveRefreshToken(
            user.id,
            newRefreshToken,
            newRefreshExpiresAt,
        );

        return {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
        };
    }

    async logout(userId: string) {
        await this.usersService.removeRefreshToken(userId);

        return {
            message: 'Logout successful',
        };
    }

    async forgotPassword(email: string) {
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new NotFoundException('Aucun compte trouvé avec cet email.');
        }

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h

        await this.usersService.saveResetToken(user.id, token, expiresAt);
        await this.mailService.sendPasswordResetEmail(user.email, token);

        return { message: 'Un lien de réinitialisation a été envoyé à votre email.' };
    }

    async resetPassword(token: string, newPassword: string) {
        const user = await this.usersService.findByResetToken(token);

        if (!user) throw new BadRequestException('Lien invalide ou expiré.');

        if (!user.reset_password_token_expires_at || user.reset_password_token_expires_at < new Date()) {
            throw new BadRequestException('Lien expiré. Veuillez refaire une demande.');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.usersService.updatePassword(user.id, hashedPassword);

        return { message: 'Mot de passe réinitialisé avec succès.' };
    }

    /**
     * Changement de mot de passe par un utilisateur connecté.
     * L'ancien mot de passe est exigé : un jeton volé ne doit pas suffire à
     * verrouiller le compte de son propriétaire.
     */
    /**
     * Contrôle du mot de passe actuel, partagé par les deux étapes du
     * changement : la vérification préalable et la modification elle-même.
     * Renvoie l'utilisateur pour éviter de le relire ensuite.
     */
    private async controlerMotDePasseActuel(userId: string, currentPassword: string) {
        const user = await this.usersService.findById(userId);
        if (!user) throw new BadRequestException('Compte introuvable.');

        if (!user.password) {
            throw new BadRequestException(
                "Ce compte utilise une connexion externe : son mot de passe se change chez le fournisseur d'identité.",
            );
        }

        const valide = await bcrypt.compare(currentPassword, user.password);
        if (!valide) throw new BadRequestException('Mot de passe actuel incorrect.');

        return user;
    }

    /** Étape 1 : l'utilisateur prouve qu'il connaît son mot de passe actuel. */
    async verifyCurrentPassword(userId: string, currentPassword: string) {
        await this.controlerMotDePasseActuel(userId, currentPassword);
        return { verified: true };
    }

    async changePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await this.controlerMotDePasseActuel(userId, currentPassword);

        if (currentPassword === newPassword) {
            throw new BadRequestException("Le nouveau mot de passe doit différer de l'ancien.");
        }

        await this.usersService.updatePassword(user.id, await bcrypt.hash(newPassword, 10));
        return { message: 'Mot de passe modifié avec succès.' };
    }

    async googleLogin(googleUser: any) {
        let user = await this.usersService.findByEmail(googleUser.email);

        if (!user) {
            user = await this.usersService.create({
                email: googleUser.email,
                password: '',
                role: Role.ECO_TRAVELER,
            });
        }

        const accessToken = await this.generateAccessToken(user);

        const refreshToken = this.generateRefreshToken();
        const refreshExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

        await this.usersService.saveRefreshToken(
            user.id,
            refreshToken,
            refreshExpiresAt,
        );

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            user,
            dashboard: this.getDashboardPathByRole(user.role),
        };
    }

    private getDashboardPathByRole(role: Role): string {
        switch (role) {
            case Role.ECO_TRAVELER:
                // `/dashboard` est le tableau de bord de l'éco-voyageur : il
                // porte ses expériences et ses lieux, que `/dashboard/ecovoyageur`
                // — une version antérieure — n'affiche pas.
                return '/dashboard';
            case Role.PROVIDER:
                return '/dashboard/provider';
            case Role.ADMIN:
                return '/dashboard/admin';
            case Role.GUIDE:
                return '/dashboard/guide';
            case Role.PROJECT:
                // Le porteur de projet a sa propre page ; le repli générique
                // l'envoyait sur `/dashboard`, incohérent avec sa navigation.
                return '/dashboard/project-owner';
            default:
                return '/dashboard';
        }
    }
}
