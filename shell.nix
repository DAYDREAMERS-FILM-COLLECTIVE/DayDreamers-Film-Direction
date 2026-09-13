{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs
    pkgs.postgresql
  ];
  shellHook = ''
    export PATH="$PWD/node_modules/.bin:$PATH"
  '';
}
