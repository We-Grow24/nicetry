"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

interface CustomDomainProps {
  projectId: string;
  deployedUrl?: string;
  currentDomain?: string;
}

interface DomainResponse {
  name: string;
  apexName: string;
  verified: boolean;
  verification?: Array<{
    type: string;
    domain: string;
    value: string;
    reason: string;
  }>;
}

export default function CustomDomain({ projectId, deployedUrl, currentDomain }: CustomDomainProps) {
  const [domain, setDomain] = useState(currentDomain || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dnsInstructions, setDnsInstructions] = useState<DomainResponse | null>(null);

  const handleConnectDomain = async () => {
    if (!domain.trim()) {
      setError("Please enter a domain name");
      return;
    }

    if (!deployedUrl) {
      setError("Please deploy your project first");
      return;
    }

    // Validate domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (!domainRegex.test(domain)) {
      setError("Please enter a valid domain name (e.g., yourdomain.com)");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setDnsInstructions(null);

    try {
      // Extract deployment name from deployed URL
      const deploymentName = `zyntrix-${projectId}`;

      // Add domain to Vercel project
      const vercelResponse = await fetch(
        `https://api.vercel.com/v9/projects/${deploymentName}/domains`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: domain })
        }
      );

      if (!vercelResponse.ok) {
        const errorData = await vercelResponse.json();
        throw new Error(errorData.error?.message || 'Failed to add domain to Vercel');
      }

      const domainData: DomainResponse = await vercelResponse.json();
      setDnsInstructions(domainData);

      // Update domain in Supabase
      const supabase = createClient();
      const { error: dbError } = await supabase
        .from('projects')
        .update({ custom_domain: domain })
        .eq('id', projectId);

      if (dbError) {
        console.error('Failed to update custom domain in database:', dbError);
      }

      setSuccess(`Domain ${domain} connected successfully!`);
    } catch (err) {
      console.error('Error connecting domain:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect domain');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
      <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">
        Custom Domain
      </h3>

      {!deployedUrl && (
        <div className="mb-4 rounded-md bg-warning/10 p-3 text-sm text-warning">
          ⚠️ Please deploy your project before connecting a custom domain.
        </div>
      )}

      <div className="mb-4">
        <label className="mb-2.5 block text-sm font-medium text-black dark:text-white">
          Domain Name
        </label>
        <input
          type="text"
          placeholder="yourdomain.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value.toLowerCase())}
          disabled={loading || !deployedUrl}
          className="w-full rounded-lg border border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
        />
        <p className="mt-1.5 text-xs text-bodydark">
          Enter your custom domain (e.g., www.yourdomain.com or yourdomain.com)
        </p>
      </div>

      <button
        onClick={handleConnectDomain}
        disabled={loading || !deployedUrl || !domain.trim()}
        className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-center font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50 lg:px-8 xl:px-10"
      >
        {loading ? (
          <>
            <svg
              className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Connecting...
          </>
        ) : (
          'Connect Domain'
        )}
      </button>

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-md bg-danger/10 p-4 text-sm text-danger">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mt-4 rounded-md bg-success/10 p-4 text-sm text-success">
          <strong>Success:</strong> {success}
        </div>
      )}

      {/* DNS Instructions */}
      {dnsInstructions && (
        <div className="mt-6 rounded-lg border border-stroke bg-gray-2 p-4 dark:border-strokedark dark:bg-meta-4">
          <h4 className="mb-3 font-semibold text-black dark:text-white">
            📋 DNS Configuration Required
          </h4>
          
          <div className="space-y-3 text-sm">
            <p className="text-bodydark">
              To complete the domain setup, add the following DNS record to your domain provider:
            </p>

            <div className="rounded-md bg-white p-3 font-mono text-xs dark:bg-boxdark">
              <div className="mb-2">
                <span className="font-semibold">Type:</span> CNAME
              </div>
              <div className="mb-2">
                <span className="font-semibold">Name:</span> {domain.startsWith('www.') ? 'www' : '@'}
              </div>
              <div>
                <span className="font-semibold">Value:</span> cname.vercel-dns.com
              </div>
            </div>

            <p className="text-bodydark">
              <strong>Note:</strong> DNS propagation can take up to 48 hours, but is usually much faster.
            </p>

            {!dnsInstructions.verified && (
              <div className="rounded-md bg-warning/10 p-3 text-warning">
                ⏳ Domain verification pending. Check back after updating your DNS records.
              </div>
            )}

            {dnsInstructions.verified && (
              <div className="rounded-md bg-success/10 p-3 text-success">
                ✓ Domain verified and ready to use!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Domain Display */}
      {currentDomain && (
        <div className="mt-4 text-sm text-bodydark">
          <strong>Current Custom Domain:</strong>{" "}
          <a
            href={`https://${currentDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {currentDomain}
          </a>
        </div>
      )}

      {deployedUrl && (
        <div className="mt-4 text-sm text-bodydark">
          <strong>Deployed URL:</strong>{" "}
          <a
            href={deployedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {deployedUrl}
          </a>
        </div>
      )}
    </div>
  );
}
