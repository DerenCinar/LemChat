import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';
import { randomInt } from 'crypto';
import type {
  ProtocolAddress,
  PublicKey,
  SenderKeyRecord,
  SessionRecord,
} from '@signalapp/libsignal-client';

type LibsignalModule = typeof import('@signalapp/libsignal-client');

interface PublicPreKey {
  id: number;
  publicKey: string;
}

interface LocalSignalState {
  identityKeyPair: string;
  registrationId: number;
  signedPreKey: string;
  signedPreKeyId: number;
  kyberPreKey: string;
  kyberPreKeyId: number;
  oneTimePreKeys: Array<{ id: number; record: string }>;
  sessions: Record<string, string>;
  identities: Record<string, string>;
  senderKeys: Record<string, string>;
}

export interface PublicKeyBundle {
  identityKey: string;
  registrationId: number;
  signedPreKeyId: number;
  signedPreKey: string;
  signedPreKeySignature: string;
  kyberPreKeyId: number;
  kyberPreKey: string;
  kyberPreKeySignature: string;
  oneTimePreKeys: PublicPreKey[];
}

let libsignal: LibsignalModule | null = null;
const states = new Map<string, LocalSignalState>();

function statePath(profileId: string): string {
  const safeId = profileId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(app.getPath('userData'), `lemchat-libsignal-${safeId}.enc`);
}

function readState(profileId: string): LocalSignalState | null {
  if (states.has(profileId)) return states.get(profileId) ?? null;
  const filePath = statePath(profileId);
  if (!fs.existsSync(filePath)) return null;

  const encoded = fs.readFileSync(filePath);
  const json = safeStorage.isEncryptionAvailable()
    ? safeStorage.decryptString(encoded)
    : encoded.toString('utf8');
  const state = JSON.parse(json) as LocalSignalState;
  states.set(profileId, state);
  return state;
}

function writeState(profileId: string, state: LocalSignalState): void {
  states.set(profileId, state);
  const json = Buffer.from(JSON.stringify(state), 'utf8');
  const encoded = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json.toString('utf8'))
    : json;
  fs.mkdirSync(path.dirname(statePath(profileId)), { recursive: true });
  fs.writeFileSync(statePath(profileId), encoded);
}

async function getLibsignal(): Promise<LibsignalModule> {
  if (!libsignal) {
    libsignal = await import('@signalapp/libsignal-client');
  }
  return libsignal;
}

function bytes(value: string): Uint8Array<ArrayBuffer> {
  const buffer = Buffer.from(value, 'base64');
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

function base64(value: Uint8Array): string {
  return Buffer.from(value).toString('base64');
}

function textBytes(value: string): Uint8Array<ArrayBuffer> {
  const buffer = Buffer.from(value, 'utf8');
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

export async function initializeIdentity(profileId: string): Promise<{ publicBundle: PublicKeyBundle }> {
  const signal = await getLibsignal();
  let state = readState(profileId);

  if (!state) {
    const identity = signal.IdentityKeyPair.generate();
    const registrationId = randomInt(1, 16384);
    const identityKeyPair = base64(identity.serialize());

    const signedPreKeyId = 1;
    const signedPreKeyPrivate = signal.PrivateKey.generate();
    const signedPreKeyPublic = signedPreKeyPrivate.getPublicKey();
    const signedPreKeySignature = identity.privateKey.sign(signedPreKeyPublic.serialize());
    const signedRecord = signal.SignedPreKeyRecord.new(
      signedPreKeyId,
      Date.now(),
      signedPreKeyPublic,
      signedPreKeyPrivate,
      signedPreKeySignature
    );

    const kyberId = 1;
    const kyberPair = signal.KEMKeyPair.generate();
    const kyberRecord = signal.KyberPreKeyRecord.new(
      kyberId,
      Date.now(),
      kyberPair,
      identity.privateKey.sign(kyberPair.getPublicKey().serialize())
    );

    const oneTimePreKeys: Array<{ id: number; record: string }> = [];
    for (let id = 1; id <= 100; id += 1) {
      const privateKey = signal.PrivateKey.generate();
      const record = signal.PreKeyRecord.new(id, privateKey.getPublicKey(), privateKey);
      oneTimePreKeys.push({ id, record: base64(record.serialize()) });
    }

    state = {
      identityKeyPair,
      registrationId,
      signedPreKey: base64(signedRecord.serialize()),
      signedPreKeyId,
      kyberPreKey: base64(kyberRecord.serialize()),
      kyberPreKeyId: kyberId,
      oneTimePreKeys,
      sessions: {},
      identities: {},
      senderKeys: {},
    };
    writeState(profileId, state);
  }

  const identity = signal.IdentityKeyPair.deserialize(bytes(state.identityKeyPair));
  const signed = signal.SignedPreKeyRecord.deserialize(bytes(state.signedPreKey));
  const kyber = signal.KyberPreKeyRecord.deserialize(bytes(state.kyberPreKey));
  const publicBundle: PublicKeyBundle = {
    identityKey: base64(identity.publicKey.serialize()),
    registrationId: state.registrationId,
    signedPreKeyId: state.signedPreKeyId,
    signedPreKey: base64(signed.publicKey().serialize()),
    signedPreKeySignature: base64(signed.signature()),
    kyberPreKeyId: state.kyberPreKeyId,
    kyberPreKey: base64(kyber.publicKey().serialize()),
    kyberPreKeySignature: base64(kyber.signature()),
    oneTimePreKeys: state.oneTimePreKeys.map((preKey) => {
      const record = signal.PreKeyRecord.deserialize(bytes(preKey.record));
      return { id: preKey.id, publicKey: base64(record.publicKey().serialize()) };
    }),
  };

  return { publicBundle };
}

interface EncryptResult {
  ciphertext: string;
  ciphertextType: number;
  encryptionVersion: 'libsignal-v1';
}

export async function encryptDirectMessage(
  profileId: string,
  recipientId: string,
  recipientBundle: PublicKeyBundle,
  plaintext: string
): Promise<EncryptResult> {
  const signal = await getLibsignal();
  const state = readState(profileId);
  if (!state) throw new Error('Local Signal identity is not initialized');

  const address = signal.ProtocolAddress.new(recipientId, 1);
  const localAddress = signal.ProtocolAddress.new(profileId, 1);
  const identity = signal.IdentityKeyPair.deserialize(bytes(state.identityKeyPair));

  const sessionStore = {
    saveSession: async (name: ProtocolAddress, record: SessionRecord) => {
      state.sessions[`${name.name()}:${name.deviceId()}`] = base64(record.serialize());
      writeState(profileId, state);
    },
    getSession: async (name: ProtocolAddress) =>
      state.sessions[`${name.name()}:${name.deviceId()}`]
        ? signal.SessionRecord.deserialize(bytes(state.sessions[`${name.name()}:${name.deviceId()}`]))
        : null,
    getExistingSessions: async (addresses: ProtocolAddress[]) =>
      addresses
        .map((name) => state.sessions[`${name.name()}:${name.deviceId()}`])
        .filter((record): record is string => Boolean(record))
        .map((record) => signal.SessionRecord.deserialize(bytes(record))),
  };

  const identityStore = {
    getIdentityKey: async () => identity.privateKey,
    getIdentityKeyPair: async () => identity,
    recordReceivedIdentity: async () => undefined,
    getLocalRegistrationId: async () => state.registrationId,
    saveIdentity: async (name: ProtocolAddress, key: PublicKey) => {
      state.identities[name.name()] = base64(key.serialize());
      writeState(profileId, state);
      return signal.IdentityChange.NewOrUnchanged;
    },
    isTrustedIdentity: async () =>
      true,
    getIdentity: async (name: ProtocolAddress) =>
      state.identities[name.name()]
        ? signal.PublicKey.deserialize(bytes(state.identities[name.name()]))
        : null,
  };

  const preKey = recipientBundle.oneTimePreKeys[0];
  const preKeyBundle = signal.PreKeyBundle.new(
    recipientBundle.registrationId,
    1,
    preKey?.id ?? null,
    preKey ? signal.PublicKey.deserialize(bytes(preKey.publicKey)) : null,
    recipientBundle.signedPreKeyId,
    signal.PublicKey.deserialize(bytes(recipientBundle.signedPreKey)),
    bytes(recipientBundle.signedPreKeySignature),
    signal.PublicKey.deserialize(bytes(recipientBundle.identityKey)),
    recipientBundle.kyberPreKeyId,
    signal.KEMPublicKey.deserialize(bytes(recipientBundle.kyberPreKey)),
    bytes(recipientBundle.kyberPreKeySignature)
  );

  await signal.processPreKeyBundle(preKeyBundle, address, localAddress, sessionStore, identityStore);
  const encrypted = await signal.signalEncrypt(
    textBytes(plaintext),
    address,
    localAddress,
    sessionStore,
    identityStore
  );

  return {
    ciphertext: base64(encrypted.serialize()),
    ciphertextType: encrypted.type(),
    encryptionVersion: 'libsignal-v1',
  };
}

export async function decryptDirectMessage(
  profileId: string,
  senderId: string,
  ciphertext: string,
  ciphertextType: number
): Promise<string> {
  const signal = await getLibsignal();
  const state = readState(profileId);
  if (!state) throw new Error('Local Signal identity is not initialized');

  const address = signal.ProtocolAddress.new(senderId, 1);
  const localAddress = signal.ProtocolAddress.new(profileId, 1);
  const identity = signal.IdentityKeyPair.deserialize(bytes(state.identityKeyPair));

  const sessionStore = {
    saveSession: async (name: ProtocolAddress, record: SessionRecord) => {
      state.sessions[`${name.name()}:${name.deviceId()}`] = base64(record.serialize());
      writeState(profileId, state);
    },
    getSession: async (name: ProtocolAddress) =>
      state.sessions[`${name.name()}:${name.deviceId()}`]
        ? signal.SessionRecord.deserialize(bytes(state.sessions[`${name.name()}:${name.deviceId()}`]))
        : null,
    getExistingSessions: async (addresses: ProtocolAddress[]) =>
      addresses
        .map((name) => state.sessions[`${name.name()}:${name.deviceId()}`])
        .filter((record): record is string => Boolean(record))
        .map((record) => signal.SessionRecord.deserialize(bytes(record))),
  };

  const identityStore = {
    getIdentityKey: async () => identity.privateKey,
    getIdentityKeyPair: async () => identity,
    recordReceivedIdentity: async () => undefined,
    getLocalRegistrationId: async () => state.registrationId,
    saveIdentity: async (name: ProtocolAddress, key: PublicKey) => {
      state.identities[name.name()] = base64(key.serialize());
      writeState(profileId, state);
      return signal.IdentityChange.NewOrUnchanged;
    },
    isTrustedIdentity: async () => true,
    getIdentity: async (name: ProtocolAddress) =>
      state.identities[name.name()]
        ? signal.PublicKey.deserialize(bytes(state.identities[name.name()]))
        : null,
  };

  const body = bytes(ciphertext);
  if (ciphertextType === signal.CiphertextMessageType.PreKey) {
    const preKeyStore = {
      savePreKey: async () => undefined,
      getPreKey: async (id: number) => {
        const match = state.oneTimePreKeys.find((preKey) => preKey.id === id);
        if (!match) throw new Error(`Unknown local pre-key ${id}`);
        return signal.PreKeyRecord.deserialize(bytes(match.record));
      },
      removePreKey: async (id: number) => {
        state.oneTimePreKeys = state.oneTimePreKeys.filter((preKey) => preKey.id !== id);
        writeState(profileId, state);
      },
    };
    const signedPreKeyStore = {
      saveSignedPreKey: async () => undefined,
      getSignedPreKey: async () =>
        signal.SignedPreKeyRecord.deserialize(bytes(state.signedPreKey)),
    };
    const kyberPreKeyStore = {
      saveKyberPreKey: async () => undefined,
      getKyberPreKey: async () =>
        signal.KyberPreKeyRecord.deserialize(bytes(state.kyberPreKey)),
      markKyberPreKeyUsed: async () => undefined,
    };
    const decrypted = await signal.signalDecryptPreKey(
      signal.PreKeySignalMessage.deserialize(body),
      address,
      localAddress,
      sessionStore,
      identityStore,
      preKeyStore,
      signedPreKeyStore,
      kyberPreKeyStore
    );
    return Buffer.from(decrypted).toString('utf8');
  }
  const decrypted = await signal.signalDecrypt(
    signal.SignalMessage.deserialize(body),
    address,
    localAddress,
    sessionStore,
    identityStore
  );
  return Buffer.from(decrypted).toString('utf8');
}

export async function createSenderKeyDistribution(
    profileId: string,
    distributionId: string
  ): Promise<{ ciphertext: string }> {
    const signal = await getLibsignal();
    const state = readState(profileId);
    if (!state) throw new Error('Local Signal identity is not initialized');

    const senderStore = {
      saveSenderKey: async (
        sender: ProtocolAddress,
        distribution: string,
        record: SenderKeyRecord
      ) => {
        state.senderKeys[`${sender.name()}:${distribution}`] = base64(record.serialize());
        writeState(profileId, state);
      },
      getSenderKey: async (
        sender: ProtocolAddress,
        distribution: string
      ) =>
        state.senderKeys[`${sender.name()}:${distribution}`]
          ? signal.SenderKeyRecord.deserialize(
              bytes(state.senderKeys[`${sender.name()}:${distribution}`])
            )
          : null,
    };
    const sender = signal.ProtocolAddress.new(profileId, 1);
    const distribution = await signal.SenderKeyDistributionMessage.create(
      sender,
      distributionId,
      senderStore
    );
    return { ciphertext: base64(distribution.serialize()) };
  }

export async function processSenderKeyDistribution(
    profileId: string,
    senderId: string,
    _distributionId: string,
    ciphertext: string
  ): Promise<void> {
    const signal = await getLibsignal();
    const state = readState(profileId);
    if (!state) throw new Error('Local Signal identity is not initialized');
    const senderStore = {
      saveSenderKey: async (
        sender: ProtocolAddress,
        distribution: string,
        record: SenderKeyRecord
      ) => {
        state.senderKeys[`${sender.name()}:${distribution}`] = base64(record.serialize());
        writeState(profileId, state);
      },
      getSenderKey: async (
        sender: ProtocolAddress,
        distribution: string
      ) =>
        state.senderKeys[`${sender.name()}:${distribution}`]
          ? signal.SenderKeyRecord.deserialize(
              bytes(state.senderKeys[`${sender.name()}:${distribution}`])
            )
          : null,
    };
    await signal.processSenderKeyDistributionMessage(
      signal.ProtocolAddress.new(senderId, 1),
      signal.SenderKeyDistributionMessage.deserialize(bytes(ciphertext)),
      senderStore
    );
  }

export async function encryptGroupMessage(
    profileId: string,
    distributionId: string,
    plaintext: string
  ): Promise<{ ciphertext: string; ciphertextType: number }> {
    const signal = await getLibsignal();
    const state = readState(profileId);
    if (!state) throw new Error('Local Signal identity is not initialized');
    const senderStore = {
      saveSenderKey: async (
        sender: ProtocolAddress,
        distribution: string,
        record: SenderKeyRecord
      ) => {
        state.senderKeys[`${sender.name()}:${distribution}`] = base64(record.serialize());
        writeState(profileId, state);
      },
      getSenderKey: async (
        sender: ProtocolAddress,
        distribution: string
      ) =>
        state.senderKeys[`${sender.name()}:${distribution}`]
          ? signal.SenderKeyRecord.deserialize(
              bytes(state.senderKeys[`${sender.name()}:${distribution}`])
            )
          : null,
    };
    const encrypted = await signal.groupEncrypt(
      signal.ProtocolAddress.new(profileId, 1),
      distributionId,
      senderStore,
      textBytes(plaintext)
    );
    return { ciphertext: base64(encrypted.serialize()), ciphertextType: encrypted.type() };
  }

export async function decryptGroupMessage(
    profileId: string,
    senderId: string,
    _distributionId: string,
    ciphertext: string
  ): Promise<string> {
    const signal = await getLibsignal();
    const state = readState(profileId);
    if (!state) throw new Error('Local Signal identity is not initialized');
    const senderStore = {
      saveSenderKey: async (
        sender: ProtocolAddress,
        distribution: string,
        record: SenderKeyRecord
      ) => {
        state.senderKeys[`${sender.name()}:${distribution}`] = base64(record.serialize());
        writeState(profileId, state);
      },
      getSenderKey: async (
        sender: ProtocolAddress,
        distribution: string
      ) =>
        state.senderKeys[`${sender.name()}:${distribution}`]
          ? signal.SenderKeyRecord.deserialize(
              bytes(state.senderKeys[`${sender.name()}:${distribution}`])
            )
          : null,
    };
    const decrypted = await signal.groupDecrypt(
      signal.ProtocolAddress.new(senderId, 1),
      senderStore,
      bytes(ciphertext)
    );
    return Buffer.from(decrypted).toString('utf8');
  }
