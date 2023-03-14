"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const _1 = require(".");
vitest_1.vi.mock('../env', async () => {
    const actual = (await vitest_1.vi.importActual('../env'));
    const MOCK_ENV = {
        ...actual.default,
        PUBLIC_URL: '/',
    };
    return {
        default: MOCK_ENV,
        getEnv: () => MOCK_ENV,
    };
});
vitest_1.vi.mock('../../src/database/index', () => ({
    default: vitest_1.vi.fn(),
    getDatabaseClient: vitest_1.vi.fn().mockReturnValue('postgres'),
}));
(0, vitest_1.describe)('Integration Tests', () => {
    (0, vitest_1.describe)('Services / Notifications', () => {
        let service;
        (0, vitest_1.beforeEach)(() => {
            service = new _1.NotificationsService({
                schema: { collections: {}, relations: [] },
            });
        });
        (0, vitest_1.afterEach)(() => {
            vitest_1.vi.restoreAllMocks();
        });
        (0, vitest_1.describe)('createOne', () => {
            let superCreateOneSpy;
            let thisSendEmailSpy;
            (0, vitest_1.beforeEach)(() => {
                superCreateOneSpy = vitest_1.vi.spyOn(_1.ItemsService.prototype, 'createOne').mockResolvedValue(0);
                thisSendEmailSpy = vitest_1.vi.spyOn(_1.NotificationsService.prototype, 'sendEmail').mockResolvedValue();
            });
            (0, vitest_1.it)('create a notification and send email', async () => {
                const data = {
                    recipient: '5aa7ffb5-bd54-46ab-8654-6dfead39694d',
                    sender: null,
                    subject: 'Notification Subject',
                    message: 'Notification Message',
                };
                await service.createOne(data);
                (0, vitest_1.expect)(superCreateOneSpy).toHaveBeenCalled();
                (0, vitest_1.expect)(superCreateOneSpy).toBeCalledWith(data, undefined);
                (0, vitest_1.expect)(thisSendEmailSpy).toHaveBeenCalled();
                (0, vitest_1.expect)(thisSendEmailSpy).toBeCalledWith(data);
            });
        });
        (0, vitest_1.describe)('createMany', () => {
            let superCreateManySpy;
            let thisSendEmailSpy;
            (0, vitest_1.beforeEach)(() => {
                superCreateManySpy = vitest_1.vi.spyOn(_1.ItemsService.prototype, 'createMany').mockResolvedValue([]);
                thisSendEmailSpy = vitest_1.vi.spyOn(_1.NotificationsService.prototype, 'sendEmail').mockResolvedValue();
            });
            (0, vitest_1.it)('create many notifications and send email for notification', async () => {
                const data = [
                    {
                        recipient: '5aa7ffb5-bd54-46ab-8654-6dfead39694d',
                        sender: null,
                        subject: 'Notification Subject',
                        message: 'Notification Message',
                    },
                    {
                        recipient: '51260c36-e944-4b0a-a370-dc83070d9d2b',
                        sender: null,
                        subject: 'Notification Subject',
                        message: 'Notification Message',
                    },
                ];
                await service.createMany(data);
                (0, vitest_1.expect)(superCreateManySpy).toBeCalledTimes(1);
                (0, vitest_1.expect)(superCreateManySpy).toBeCalledWith(data, undefined);
                (0, vitest_1.expect)(thisSendEmailSpy).toBeCalledTimes(data.length);
            });
        });
        (0, vitest_1.describe)('sendEmail', () => {
            let usersServiceReadOneSpy;
            let mailServiceSendSpy;
            (0, vitest_1.beforeEach)(() => {
                usersServiceReadOneSpy = vitest_1.vi.spyOn(service.usersService, 'readOne').mockResolvedValue({});
                mailServiceSendSpy = vitest_1.vi.spyOn(service.mailService, 'send').mockResolvedValue(0);
            });
            (0, vitest_1.it)('do nothing when there is no recipient', async () => {
                await service.sendEmail({
                    sender: null,
                    subject: 'Notification Subject',
                    message: 'Notification Message',
                });
                (0, vitest_1.expect)(usersServiceReadOneSpy).not.toHaveBeenCalled();
            });
            (0, vitest_1.it)('read recipient detail from userService when there is recipient', async () => {
                usersServiceReadOneSpy.mockReturnValue(Promise.resolve({ id: '5aa7ffb5-bd54-46ab-8654-6dfead39694d' }));
                await service.sendEmail({
                    recipient: '5aa7ffb5-bd54-46ab-8654-6dfead39694d',
                    sender: null,
                    subject: 'Notification Subject',
                    message: 'Notification Message',
                });
                (0, vitest_1.expect)(usersServiceReadOneSpy).toHaveBeenCalled();
            });
            (0, vitest_1.it)('do not send email when user does not have email', async () => {
                usersServiceReadOneSpy.mockReturnValue(Promise.resolve({ id: '5aa7ffb5-bd54-46ab-8654-6dfead39694d' }));
                await service.sendEmail({
                    recipient: '5aa7ffb5-bd54-46ab-8654-6dfead39694d',
                    sender: null,
                    subject: 'Notification Subject',
                    message: 'Notification Message',
                });
                (0, vitest_1.expect)(usersServiceReadOneSpy).toHaveBeenCalled();
                (0, vitest_1.expect)(mailServiceSendSpy).not.toHaveBeenCalled();
            });
            (0, vitest_1.it)('do not send email when user have email but disabled email notification', async () => {
                usersServiceReadOneSpy.mockReturnValue(Promise.resolve({
                    id: '5aa7ffb5-bd54-46ab-8654-6dfead39694d',
                    email: 'user@example.com',
                    email_notifications: false,
                }));
                await service.sendEmail({
                    recipient: '5aa7ffb5-bd54-46ab-8654-6dfead39694d',
                    sender: null,
                    subject: 'Notification Subject',
                    message: 'Notification Message',
                });
                (0, vitest_1.expect)(usersServiceReadOneSpy).toHaveBeenCalled();
                (0, vitest_1.expect)(mailServiceSendSpy).not.toHaveBeenCalled();
            });
            (0, vitest_1.it)('send email without url when user role does not have app access', async () => {
                const userDetail = {
                    id: '5aa7ffb5-bd54-46ab-8654-6dfead39694d',
                    email: 'user@example.com',
                    email_notifications: true,
                    role: {
                        app_access: false,
                    },
                };
                usersServiceReadOneSpy.mockReturnValue(Promise.resolve(userDetail));
                const notificationDetail = {
                    recipient: '5aa7ffb5-bd54-46ab-8654-6dfead39694d',
                    sender: null,
                    subject: 'Notification Subject',
                    message: 'Notification Message',
                };
                await service.sendEmail(notificationDetail);
                (0, vitest_1.expect)(usersServiceReadOneSpy).toHaveBeenCalled();
                (0, vitest_1.expect)(mailServiceSendSpy).toHaveBeenCalled();
                (0, vitest_1.expect)(mailServiceSendSpy).toHaveBeenCalledWith({
                    template: {
                        name: 'base',
                        data: { html: `<p>${notificationDetail.message}</p>\n` },
                    },
                    to: userDetail.email,
                    subject: notificationDetail.subject,
                });
            });
            (0, vitest_1.it)('send email with url when user role have app access', async () => {
                const userDetail = {
                    id: '5aa7ffb5-bd54-46ab-8654-6dfead39694d',
                    email: 'user@example.com',
                    email_notifications: true,
                    role: {
                        app_access: true,
                    },
                };
                usersServiceReadOneSpy.mockReturnValue(Promise.resolve(userDetail));
                const notificationDetail = {
                    recipient: '5aa7ffb5-bd54-46ab-8654-6dfead39694d',
                    sender: null,
                    subject: 'Notification Subject',
                    message: 'Notification Message',
                };
                await service.sendEmail(notificationDetail);
                (0, vitest_1.expect)(usersServiceReadOneSpy).toHaveBeenCalled();
                (0, vitest_1.expect)(mailServiceSendSpy).toHaveBeenCalled();
                (0, vitest_1.expect)(mailServiceSendSpy).toHaveBeenCalledWith({
                    template: {
                        name: 'base',
                        data: {
                            url: `/admin/users/${userDetail.id}`,
                            html: `<p>${notificationDetail.message}</p>\n`,
                        },
                    },
                    to: userDetail.email,
                    subject: notificationDetail.subject,
                });
            });
        });
    });
});
