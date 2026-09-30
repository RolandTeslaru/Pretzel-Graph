import { Injectable } from '@nestjs/common';
import { Release } from '@pretzel-graph/shared/domain';
import { System } from '@pretzel-graph/shared/system';
import { RELEASE } from '@/utils/release';
import { CloudService } from '../Cloud/cloud.service';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class ReleaseService {

    private readonly log = System.log.withContext("Release");

    private latest: Release.Version | null = null;

    private checkedAt = 0;

    private inflight: Promise<void> | null = null;

    constructor(private readonly cloud: CloudService) {}

    // The newer version to offer, or null when this one is current or the check is off.
    public async getAvailableUpdate(): Promise<Release.Version | null> {
        if (process.env.UPDATE_CHECK !== 'true' || !this.cloud.isConfigured)
            return null;

        if (Date.now() - this.checkedAt > CHECK_INTERVAL_MS) {
            // Single-flight: concurrent requests share one check.
            this.inflight ??= this.refresh().finally(() => { this.inflight = null; });

            await this.inflight;
        }

        const current = Release.Version.safeParse(RELEASE);

        if (!this.latest || !current.success)
            return null;

        return Release.isNewer(this.latest, current.data) ? this.latest : null;
    }

    // Asks for the latest released version; a failure keeps the last answer.
    private async refresh(): Promise<void> {
        this.checkedAt = Date.now();

        try {
            const response = await this.cloud.fetch('/api/releases/latest', { method: 'GET' });

            if (!response.ok)
                return;

            const body = await response.json() as { name?: unknown };

            const version = Release.Version.safeParse(body.name);

            if (version.success)
                this.latest = version.data;
        }
        catch (error) {
            this.log.warning(`Could not check for a newer version: ${(error as Error).message}`);
        }
    }
}
