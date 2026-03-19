export interface WindowSpecInfo {
    readonly name: string;
    readonly sticky: boolean;
    readonly isDefault: boolean;
    readonly matchUrls: readonly string[];
}

export interface GetCurrentWindowSpecUseCase {
    execute(firefoxWindowId: number): Promise<WindowSpecInfo | null>;
}

