export class HuijiCookies {
    private cookies: Record<string, string> = {};

    constructor(cookies?: string[]) {
        this.cookies = {};
        if (cookies) {
            this.setCookies(cookies);
        }
    }

    setCookies(cookies: string[]) {
        for (const cookiePart of cookies) {
            const cookieList = cookiePart.split(';');
            for (const cookie of cookieList) {
                const [key, value] = cookie.trim().split('=');
                if (key && value) {
                    this.cookies[key] = value;
                }
            }
        }
    }

    getCookies() {
        return Object.entries(this.cookies)
            .map(([key, value]) => `${key}=${value}`)
            .join('; ');
    }

    hasCookie(key: string): boolean {
        return this.cookies.hasOwnProperty(key);
    }
}
