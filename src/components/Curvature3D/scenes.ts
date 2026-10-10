// Tipos e cenas prontas da curvatura — só dados, sem o motor. Componentes de
// servidor importam daqui sem puxar o WebGL para o bundle.

export interface CurvatureOrbit {
  /** Raio da órbita em torno da massa principal (unidades de mundo). */
  r: number;
  /** Velocidade angular (rad/s). */
  speed: number;
  /** Achatamento no eixo z; 0/ausente = círculo (mesmo `ecc || 1` do original). */
  ecc?: number;
  /** Ângulo inicial (rad). */
  phase?: number;
}

export interface CurvatureMass {
  x?: number;
  z?: number;
  /** Massa (profundidade do poço). */
  m?: number;
  /** Raio visual da esfera. */
  R?: number;
  /** Só faz efeito na segunda massa: ela orbita a primeira. */
  orbit?: CurvatureOrbit | null;
}

export interface CurvatureCamera {
  dist?: number;
  /** Elevação (rad). */
  el?: number;
  /** Campo de visão vertical (graus). */
  fov?: number;
  /** Altura do alvo da câmera. */
  ty?: number;
  /** Rotação automática (rad/s). */
  spin?: number;
  yaw?: number;
}

export interface CurvatureOptions {
  /** Até duas massas; a primeira é a arrastável. */
  masses?: CurvatureMass[];
  /** Massa da cena padrão quando `masses` não é informado. */
  mass?: number;
  bodies?: number;
  photons?: number;
  seed?: number;
  /** Tamanho da célula da grade fina. */
  cell?: number;
  camera?: CurvatureCamera;
}

export interface CurvatureApi {
  pause(b: boolean): void;
  destroy(): void;
  reset(): void;
}

/** Cena da página 404: massa rosa deslocada + companheira verde em órbita excêntrica. */
export const NF_CURV: CurvatureOptions = {
  masses: [
    { x: -0.4, z: 0.3, m: 3.8, R: 0.66 },
    { m: 1.1, R: 0.3, orbit: { r: 4.4, speed: 0.34, ecc: 0.72 } },
  ],
  bodies: 9,
  photons: 10,
  seed: 404,
  camera: { dist: 14.6, el: 0.48 },
};
