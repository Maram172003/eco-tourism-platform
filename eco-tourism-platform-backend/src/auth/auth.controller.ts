import { Body, Controller, Get, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiTags } from '@nestjs/swagger';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { GoogleAuthGuard } from '../common/guards/google-auth.guard';
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Public()
    // Rate limiting : max 3 inscriptions par minute (anti brute force / spam)
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @Post('register')
    async register(@Body() dto: RegisterDto) {
        const result = await this.authService.register(dto);
        return result;
    }

    @Public()
    @Get('verify-email')
    async verifyEmail(@Query('token') token: string, @Res() res: Response) {
        const result = await this.authService.verifyEmail(token);

        const redirectUrl =
            `${process.env.FRONTEND_URL}/auth/callback` +
            `?accessToken=${encodeURIComponent(result.access_token)}` +
            `&refreshToken=${encodeURIComponent(result.refresh_token)}` +
            `&dashboard=${encodeURIComponent(result.dashboard)}` +
            `&user=${encodeURIComponent(JSON.stringify({
                id: result.user.id,
                email: result.user.email,
                role: result.user.role,
                status: result.user.status,
            }))}`;

        return res.redirect(redirectUrl);
    }

    @Public()
    // Rate limiting : max 5 tentatives de connexion par minute (anti brute force)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('login')
    async login(@Body() dto: LoginDto) {
        const result = await this.authService.login(dto);
        return result;
    }

    @Public()
    @Post('refresh')
    async refresh(@Body() dto: RefreshTokenDto) {
        const result = await this.authService.refresh(dto);
        return result;
    }

    @Public()
    // Rate limiting : max 3 demandes par minute (anti spam email)
    @Throttle({ default: { limit: 3, ttl: 60000 } })
    @Post('forgot-password')
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.authService.forgotPassword(dto.email);
    }

    @Public()
    @Post('reset-password')
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return this.authService.resetPassword(dto.token, dto.password);
    }

    @Post('verify-password')
    async verifyPassword(@Req() req: any, @Body() dto: VerifyPasswordDto) {
        return this.authService.verifyCurrentPassword(req.user.sub, dto.current_password);
    }

    @Patch('change-password')
    async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
        return this.authService.changePassword(req.user.sub, dto.current_password, dto.new_password);
    }

    @Post('logout')
    async logout(@Req() req: any) {
        const result = await this.authService.logout(req.user.sub);
        return result;
    }
    @Public()
    @Get('google')
    @UseGuards(GoogleAuthGuard)
    async googleAuth() { }

    @Public()
    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    async googleAuthCallback(@Req() req: any, @Res() res: Response) {
        const result = await this.authService.googleLogin(req.user);

        const redirectUrl =
            `${process.env.FRONTEND_URL}/auth/callback` +
            `?accessToken=${encodeURIComponent(result.access_token)}` +
            `&refreshToken=${encodeURIComponent(result.refresh_token)}` +
            `&user=${encodeURIComponent(JSON.stringify({
                id: result.user.id,
                email: result.user.email,
                role: result.user.role,
                status: result.user.status,
            }))}`;

        return res.redirect(redirectUrl);
    }


}
