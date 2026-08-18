export enum AuthType {
  PASSWORD = 'password',
  PRIVATE_KEY = 'privateKey',
}

export enum RdpProtocol {
  RDP = 'rdp',
  VNC = 'vnc',
}

export enum RdpSecurity {
  ANY = 'any',
  NLA = 'nla',
  RDP = 'rdp',
  TLS = 'tls',
}

export enum DockerAction {
  START = 'start',
  STOP = 'stop',
  RESTART = 'restart',
}

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

