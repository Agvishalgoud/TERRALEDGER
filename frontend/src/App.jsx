import { useState } from "react";
import { ethers } from "ethers";
import { connectWallet } from "./contract.js";
import { loadBlockchainHistory } from "./history.js";
import "./index.css";

function shortAddress(value) {
  if (typeof value !== "string" || !value.startsWith("0x") || value.length < 12) return String(value ?? "—");
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function printableArgs(args) {
  if (!args) return "";
  return Object.values(args).map((value) => {
    if (typeof value === "bigint") return value.toString();
    if (typeof value === "string" && value.startsWith("0x") && value.length === 42) return shortAddress(value);
    return String(value);
  }).join(" · ");
}

function App() {
  const [activeTab, setActiveTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [location, setLocation] = useState("");
  const [area, setArea] = useState("");
  const [notice, setNotice] = useState("");
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [verifiedProperty, setVerifiedProperty] = useState(null);
  const [documentReference, setDocumentReference] = useState("");
  const [transactionPending, setTransactionPending] = useState(false);
  const [authorityAddress, setAuthorityAddress] = useState("");
  const [isAuthority, setIsAuthority] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const registeredProperties = history
    .filter((item) => item.eventName.toLowerCase().includes("propertyregistered"))
    .map((item) => {
      const args = item.args ?? {};
      const propertyId = args.propertyId ?? args.propertyID ?? args[0] ?? "Unknown ID";
      const owner = args.owner ?? args.registeredBy ?? args[1] ?? item.actor ?? "—";
      return {
        id: String(propertyId),
        location: "Hashed on-chain",
        area: "Use Verify Title",
        owner: shortAddress(String(owner)),
        status: "Registered on-chain",
        timestamp: item.timestamp,
        transactionHash: item.transactionHash,
      };
    });

  const uniqueRegisteredProperties = Array.from(
    new Map(registeredProperties.map((property) => [property.id, property])).values()
  );

  const approvedPropertyIds = new Set(
    history
      .filter((item) => item.eventName.toLowerCase().includes("propertyapproved"))
      .map((item) => {
        const args = item.args ?? {};
        return String(args.propertyId ?? args.propertyID ?? args[0] ?? "");
      })
      .filter(Boolean)
  );

  const filteredProperties = uniqueRegisteredProperties.filter((property) =>
    `${property.id} ${property.owner}`.toLowerCase().includes(search.toLowerCase())
  );

  async function refreshHistory(contractOverride = null) {
    const contract = contractOverride ?? wallet?.contract;
    if (!contract) return;
    try {
      setLoadingHistory(true);
      setHistoryError("");
      const events = await loadBlockchainHistory(contract);
      setHistory(events);
    } catch (error) {
      setHistoryError(error.shortMessage || error.message || "Could not load on-chain history.");
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleConnectWallet() {
    try {
      setConnecting(true);
      setNotice("");

      const connectedWallet = await connectWallet();
      setWallet(connectedWallet);

      // Read the current wallet's permissions from the deployed contract.
      const [adminAddress, authorityStatus] = await Promise.all([
        connectedWallet.contract.admin(),
        connectedWallet.contract.authorities(connectedWallet.account),
      ]);

      const adminStatus =
        adminAddress.toLowerCase() === connectedWallet.account.toLowerCase();

      setIsAdmin(adminStatus);
      setIsAuthority(Boolean(authorityStatus) || adminStatus);
      setNotice(
        `Wallet connected: ${connectedWallet.account}. ${
          adminStatus
            ? "Admin wallet."
            : authorityStatus
              ? "Authorized authority wallet."
              : "Standard wallet."
        }`
      );
      await refreshHistory(connectedWallet.contract);
    } catch (error) {
      setNotice(
        error.shortMessage ||
          error.reason ||
          error.message ||
          "Unable to connect wallet."
      );
    } finally {
      setConnecting(false);
    }
  }

  async function handleRegistration(event) {
    event.preventDefault();
    setNotice("");
    setVerifiedProperty(null);

    if (!wallet) {
      setNotice("Please connect MetaMask first.");
      return;
    }

    if (
      !propertyId.trim() ||
      !location.trim() ||
      !area.trim() ||
      !documentReference.trim()
    ) {
      setNotice("Please fill in all fields.");
      return;
    }

    const areaSqMeters = Number(area);
    if (!Number.isSafeInteger(areaSqMeters) || areaSqMeters <= 0) {
      setNotice("Area must be a positive whole number in square meters.");
      return;
    }

    try {
      setTransactionPending(true);

      // Prevent duplicate property IDs before sending a transaction.
      const existing = await wallet.contract.verifyProperty(propertyId.trim());
      if (existing.exists) {
        setNotice(`Property ID ${propertyId.trim()} already exists. Duplicate registration is not allowed. Use Verify Title to check its status.`);
        return;
      }

      const locationHash = ethers.id(location.trim());
      const documentHash = ethers.id(documentReference.trim());

      setNotice("Please confirm the registration transaction in MetaMask.");
      const tx = await wallet.contract.registerProperty(
        propertyId.trim(),
        locationHash,
        documentHash,
        areaSqMeters
      );

      setNotice("Transaction submitted. Waiting for confirmation...");
      await tx.wait();
      await refreshHistory();

      setNotice(
        `Property ${propertyId.trim()} was registered and sent for authority verification. It is not verified until an authorized authority approves it. Transaction: ${tx.hash}`
      );
      setPropertyId("");
      setLocation("");
      setArea("");
      setDocumentReference("");
    } catch (error) {
      setNotice(
        error.reason ||
          error.shortMessage ||
          error.message ||
          "Registration failed."
      );
    } finally {
      setTransactionPending(false);
    }
  }

  async function handleVerification(event) {
    event.preventDefault();
    setNotice("");
    setVerifiedProperty(null);

    if (!wallet) {
      setNotice("Please connect MetaMask first.");
      return;
    }

    if (!search.trim()) {
      setNotice("Enter a property ID.");
      return;
    }

    try {
      setTransactionPending(true);
      const property = await wallet.contract.verifyProperty(search.trim());

      if (!property.exists) {
        setVerifiedProperty(null);
        setNotice(`Property ${search.trim()} was not found on-chain. Register it first; it will then be pending authority verification.`);
        return;
      }

      setVerifiedProperty({
        propertyId: property.propertyId,
        owner: property.owner,
        areaSqMeters: property.areaSqMeters.toString(),
        locationHash: property.locationHash,
        documentHash: property.documentHash,
        approved: property.approved,
        pendingOwner: property.pendingOwner,
      });

      setNotice(property.approved
        ? `PROPERTY VERIFIED: ${search.trim()} is registered and approved by an authority.`
        : `PROPERTY FOUND: ${search.trim()} is registered but not yet approved. It is awaiting authority verification.`);
    } catch (error) {
      setNotice(
        error.reason ||
          error.shortMessage ||
          error.message ||
          "Property lookup failed."
      );
    } finally {
      setTransactionPending(false);
    }
  }

  async function handleSetAuthority(event) {
    event.preventDefault();
    setNotice("");

    if (!wallet) {
      setNotice("Please connect MetaMask first.");
      return;
    }
    if (!isAdmin) {
      setNotice("Only the contract admin can grant authority permissions.");
      return;
    }
    if (!ethers.isAddress(authorityAddress)) {
      setNotice("Enter a valid Ethereum wallet address.");
      return;
    }

    try {
      setTransactionPending(true);
      setNotice("Please confirm the authority transaction in MetaMask.");
      const tx = await wallet.contract.setAuthority(authorityAddress.trim(), true);
      setNotice("Authority transaction submitted. Waiting for confirmation...");
      await tx.wait();
      await refreshHistory();
      setNotice(`Authority granted to ${authorityAddress.trim()}.`);
      setAuthorityAddress("");
    } catch (error) {
      setNotice(
        error.reason ||
          error.shortMessage ||
          error.message ||
          "Failed to grant authority."
      );
    } finally {
      setTransactionPending(false);
    }
  }

  async function handleRevokeAuthority(event) {
    event.preventDefault();
    setNotice("");

    if (!wallet) {
      setNotice("Please connect MetaMask first.");
      return;
    }
    if (!isAdmin) {
      setNotice("Only the contract admin can revoke authority permissions.");
      return;
    }
    if (!ethers.isAddress(authorityAddress)) {
      setNotice("Enter a valid Ethereum wallet address.");
      return;
    }

    try {
      setTransactionPending(true);
      setNotice("Please confirm the revoke transaction in MetaMask.");
      const tx = await wallet.contract.setAuthority(authorityAddress.trim(), false);
      setNotice("Revoke transaction submitted. Waiting for confirmation...");
      await tx.wait();
      await refreshHistory();
      setNotice(`Authority revoked for ${authorityAddress.trim()}.`);
      setAuthorityAddress("");
    } catch (error) {
      setNotice(
        error.reason ||
          error.shortMessage ||
          error.message ||
          "Failed to revoke authority."
      );
    } finally {
      setTransactionPending(false);
    }
  }

  async function handleApproveProperty() {
    setNotice("");

    if (!wallet) {
      setNotice("Please connect MetaMask first.");
      return;
    }
    if (!isAuthority) {
      setNotice("This wallet is not authorized to approve properties.");
      return;
    }
    if (!search.trim()) {
      setNotice("Enter a property ID in the Verify Title section first.");
      return;
    }

    try {
      setTransactionPending(true);
      setNotice("Please confirm the approval transaction in MetaMask.");
      const tx = await wallet.contract.approveProperty(search.trim());
      setNotice("Approval submitted. Waiting for confirmation...");
      await tx.wait();
      await refreshHistory();

      const property = await wallet.contract.verifyProperty(search.trim());
      setVerifiedProperty({
        propertyId: property.propertyId,
        owner: property.owner,
        areaSqMeters: property.areaSqMeters.toString(),
        locationHash: property.locationHash,
        documentHash: property.documentHash,
        approved: property.approved,
        pendingOwner: property.pendingOwner,
      });
      setNotice(property.exists && property.approved
        ? `PROPERTY VERIFIED: ${search.trim()} is now approved on-chain.`
        : `Approval transaction completed for ${search.trim()}. Refresh Verify Title to confirm its status.`);
    } catch (error) {
      setNotice(
        error.reason ||
          error.shortMessage ||
          error.message ||
          "Property approval failed. Check whether this wallet is authorized."
      );
    } finally {
      setTransactionPending(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">T</div>
          <div>
            <h2>TERRALEDGER</h2>
            <p>VERIFIABLE LAND TITLES</p>
          </div>
        </div>

        <p className="nav-label">WORKSPACE</p>
        <nav className="navigation">
          {[
            "Overview",
            "Properties",
            "Register Property",
            "Verify Title",
            "Authority Approval",
            "Blockchain History",
          ].map((tab) => (
            <button
              key={tab}
              className={`nav-item ${activeTab === tab ? "active" : ""}`}
              onClick={() => {
                setActiveTab(tab);
                setNotice("");
              }}
            >
              <span className="nav-icon">
                {{
                  Overview: "▦",
                  Properties: "⌂",
                  "Register Property": "+",
                  "Verify Title": "✓",
                  "Authority Approval": "⚑",
                  "Blockchain History": "◷",
                }[tab]}
              </span>
              {tab}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="network-card">
            <span className="network-dot" />
            <div>
              <strong>Sepolia Testnet</strong>
              <p>Prototype environment</p>
            </div>
          </div>
          <p className="sidebar-footer">
            TERRALEDGER v0.1
            <br />
            Educational prototype
          </p>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">LAND REGISTRY PROTOCOL</p>
            <h1>{activeTab}</h1>
          </div>
          <div className="wallet-status">
            {wallet ? (
              <div>
                <span className="network-dot" /> {wallet.account.slice(0, 6)}...
                {wallet.account.slice(-4)}
                <small style={{ display: "block" }}>
                  {isAdmin ? "Admin" : isAuthority ? "Authorized authority" : "Connected"}
                </small>
              </div>
            ) : (
              <button
                className="primary-button"
                onClick={handleConnectWallet}
                disabled={connecting}
              >
                {connecting ? "Connecting..." : "Connect MetaMask"}
              </button>
            )}
          </div>
        </header>

        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}

        {activeTab === "Overview" && (
          <>
            <section className="hero">
              <div className="hero-content">
                <p className="eyebrow hero-eyebrow">TRUST THROUGH TRANSPARENCY</p>
                <h2>
                  Property records.
                  <br />
                  Made verifiable.
                </h2>
                <p className="hero-description">
                  Explore a blockchain-powered approach to property registration,
                  ownership records, and title verification.
                </p>
                <button
                  className="primary-button"
                  onClick={() => {
                    setActiveTab("Verify Title");
                    setSearch("");
                    setNotice("");
                  }}
                >
                  Verify a title <span>→</span>
                </button>
              </div>
              <div className="hero-symbol" aria-hidden="true">⌂</div>
            </section>

            <section className="stats-grid">
              <article className="stat-card">
                <p>Registered properties</p>
                <h3>{wallet ? uniqueRegisteredProperties.length.toString().padStart(2, "0") : "—"}</h3>
                <small>{wallet ? "Discovered from on-chain events" : "Connect MetaMask to load live data"}</small>
              </article>
              <article className="stat-card">
                <p>Authority approved</p>
                <h3>{wallet ? approvedPropertyIds.size.toString().padStart(2, "0") : "—"}</h3>
                <small>{wallet ? "Unique property approval events" : "Connect MetaMask to load live data"}</small>
              </article>
              <article className="stat-card">
                <p>Blockchain network</p>
                <h3 className="network-name">Sepolia</h3>
                <small>Contract deployed</small>
              </article>
            </section>

            <section className="section-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">PROPERTY REGISTER</p>
                  <h2>Recent on-chain properties</h2>
                </div>
                <button className="text-button" onClick={() => setActiveTab("Properties")}>
                  View all →
                </button>
              </div>
              <PropertyTable properties={uniqueRegisteredProperties.slice(0, 5)} />
              <p className="muted">Counts are calculated from events emitted by the deployed contract. Connect MetaMask and refresh blockchain history. If the contract does not emit registration or approval events, event-based counts cannot be complete.</p>
            </section>
          </>
        )}

        {activeTab === "Properties" && (
          <section className="section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">REGISTER EXPLORER</p>
                <h2>Live on-chain property registrations</h2>
              </div>
              <button className="primary-button" onClick={() => refreshHistory()} disabled={!wallet || loadingHistory}>
                {loadingHistory ? "Loading..." : "Refresh records"}
              </button>
            </div>
            <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search property ID or owner..." />
            {!wallet && <p className="muted">Connect MetaMask to load live Sepolia records.</p>}
            {historyError && <p className="notice" role="alert">{historyError}</p>}
            <PropertyTable properties={filteredProperties} />
            {wallet && !loadingHistory && filteredProperties.length === 0 && <p className="empty-state">No registration events found for this contract yet, or the contract ABI does not expose registration events.</p>}
            <p className="muted">Location and document values are hashed by the contract, so they are not recovered from the blockchain history.</p>
          </section>
        )}

        {activeTab === "Blockchain History" && (
          <section className="section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">SEPOLIA TRANSACTION LOG</p>
                <h2>Live blockchain history</h2>
                <p className="muted">Events and timestamps read from blocks on Sepolia.</p>
              </div>
              <button className="primary-button" onClick={() => refreshHistory()} disabled={!wallet || loadingHistory}>
                {loadingHistory ? "Loading..." : "Refresh history"}
              </button>
            </div>
            {!wallet && <p className="muted">Connect MetaMask to load history.</p>}
            {historyError && <p className="notice" role="alert">{historyError}</p>}
            {loadingHistory && <p className="muted">Reading contract event logs and block timestamps...</p>}
            {!loadingHistory && wallet && history.length === 0 && !historyError && <p className="empty-state">No contract events were found. Check that the deployed ABI contains events and that your RPC allows historical log queries.</p>}
            <div className="table-scroll">
              <table>
                <thead><tr><th>EVENT</th><th>BLOCK TIME</th><th>BLOCK</th><th>EVENT DATA</th><th>TRANSACTION</th></tr></thead>
                <tbody>
                  {history.map((item, index) => (
                    <tr key={`${item.transactionHash}-${item.eventName}-${index}`}>
                      <td className="property-id">{item.eventName}</td>
                      <td>{item.timestamp == null ? "Unavailable" : new Date(item.timestamp * 1000).toLocaleString()}</td>
                      <td>{item.blockNumber}</td>
                      <td className="owner-address">{printableArgs(item.args) || "—"}</td>
                      <td><a href={`https://sepolia.etherscan.io/tx/${item.transactionHash}`} target="_blank" rel="noreferrer">View transaction ↗</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">Timestamps are block timestamps, not a separate legal timestamp. Events can only show actions for which the contract emitted logs.</p>
          </section>
        )}

        {activeTab === "Register Property" && (
          <section className="section-card form-card">
            <p className="eyebrow">NEW APPLICATION</p>
            <h2>Register a property</h2>
            <p className="muted">
              Enter test property information. The location and document reference are
              hashed before submission; their original values are not stored on-chain.
            </p>
            <form onSubmit={handleRegistration}>
              <label htmlFor="propertyId">Property reference ID</label>
              <input
                id="propertyId"
                value={propertyId}
                onChange={(event) => setPropertyId(event.target.value)}
                placeholder="TL-TEST-0001"
                required
              />

              <label htmlFor="location">Property location</label>
              <input
                id="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City, state (test data only)"
                required
              />

              <label htmlFor="area">Property area (square meters)</label>
              <input
                id="area"
                type="number"
                min="1"
                step="1"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                placeholder="e.g. 120"
                required
              />

              <label htmlFor="documentReference">Document reference for hashing</label>
              <input
                id="documentReference"
                value={documentReference}
                onChange={(event) => setDocumentReference(event.target.value)}
                placeholder="e.g. TEST-DOCUMENT-001"
                required
              />

              <button className="primary-button" type="submit" disabled={transactionPending}>
                {transactionPending ? "Processing transaction..." : "Register on blockchain →"}
              </button>
            </form>
          </section>
        )}

        {activeTab === "Verify Title" && (
          <section className="section-card form-card">
            <p className="eyebrow">TITLE LOOKUP</p>
            <h2>Verify a property record</h2>
            <p className="muted">
              Retrieve a specific property record from the deployed Sepolia contract.
            </p>
            <form onSubmit={handleVerification}>
              <label htmlFor="verifyId">Property reference ID</label>
              <input
                id="verifyId"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="TL-TEST-0001"
                required
              />
              <button className="primary-button" type="submit" disabled={transactionPending}>
                {transactionPending ? "Checking..." : "Verify on blockchain →"}
              </button>
            </form>

            {verifiedProperty && (
              <div className="section-card">
                <h3>{verifiedProperty.approved ? "Property verified" : "Property awaiting authority verification"}</h3>
                <p><strong>Status:</strong> {verifiedProperty.approved ? "VERIFIED — authority approval recorded on-chain" : "PENDING — registered, awaiting authority approval"}</p>
                <p><strong>Property ID:</strong> {verifiedProperty.propertyId}</p>
                <p><strong>Owner:</strong> {verifiedProperty.owner}</p>
                <p><strong>Area:</strong> {verifiedProperty.areaSqMeters} m²</p>
                <p>
                  <strong>Authority approved:</strong>{" "}
                  {verifiedProperty.approved ? "Yes" : "No"}
                </p>
                <p>
                  <strong>Pending owner:</strong>{" "}
                  {verifiedProperty.pendingOwner === ethers.ZeroAddress
                    ? "None"
                    : verifiedProperty.pendingOwner}
                </p>
                <p><strong>Location hash:</strong> {verifiedProperty.locationHash}</p>
                <p><strong>Document hash:</strong> {verifiedProperty.documentHash}</p>
              </div>
            )}
          </section>
        )}

        {activeTab === "Authority Approval" && (
          <section className="section-card form-card">
            <p className="eyebrow">REGISTRY ADMINISTRATION</p>
            <h2>Authority approval</h2>
            <p className="muted">
              The contract admin can grant or revoke authority permissions. Authorized
              wallets can approve property records. Use test wallets on Sepolia.
            </p>

            <div className="section-card">
              <h3>Current wallet permissions</h3>
              <p>
                <strong>Admin:</strong> {isAdmin ? "Yes" : "No"}
              </p>
              <p>
                <strong>Can approve properties:</strong> {isAuthority ? "Yes" : "No"}
              </p>
            </div>

            <h3>Grant authority access</h3>
            <form onSubmit={handleSetAuthority}>
              <label htmlFor="authorityAddress">Authority wallet address</label>
              <input
                id="authorityAddress"
                value={authorityAddress}
                onChange={(event) => setAuthorityAddress(event.target.value)}
                placeholder="0x..."
                required
              />
              <button
                className="primary-button"
                type="submit"
                disabled={transactionPending || !isAdmin}
              >
                {transactionPending ? "Processing..." : "Grant authority"}
              </button>
            </form>

            <form onSubmit={handleRevokeAuthority}>
              <button
                className="secondary-button"
                type="submit"
                disabled={transactionPending || !isAdmin || !authorityAddress.trim()}
              >
                Revoke authority
              </button>
            </form>

            <hr />

            <h3>Approve a registered property</h3>
            <p className="muted">
              Enter the property's ID in Verify Title first. Then return here and click
              approve. The transaction must be signed by the admin or an authorized
              authority, according to the contract's access rules.
            </p>
            <p><strong>Selected property ID:</strong> {search.trim() || "Not entered"}</p>
            <button
              className="primary-button"
              type="button"
              disabled={transactionPending || !isAuthority || !search.trim()}
              onClick={handleApproveProperty}
            >
              {transactionPending ? "Processing..." : "Approve property"}
            </button>
          </section>
        )}

        <footer className="page-footer">
          TERRALEDGER · Blockchain property registry prototype · Test data only
        </footer>
      </main>
    </div>
  );
}

function PropertyTable({ properties }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>PROPERTY ID</th>
            <th>LOCATION</th>
            <th>AREA</th>
            <th>RECORDED OWNER</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr key={property.id}>
              <td className="property-id">{property.id}</td>
              <td>{property.location}</td>
              <td>{property.area}</td>
              <td className="owner-address">{property.owner}</td>
              <td>
                <span
                  className={`status ${
                    property.status.startsWith("Demo verified") ? "verified" : "pending"
                  }`}
                >
                  {property.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
