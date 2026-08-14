{
  description = "Oh My Pi development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };
        
        # Read rust-toolchain.toml to get the exact nightly version
        rustToolchain = pkgs.rust-bin.nightly."2026-07-28".default.override {
          extensions = [ "rustfmt" "clippy" "rust-analyzer" ];
          targets = [ "x86_64-unknown-linux-gnu" "x86_64-pc-windows-msvc" ];
        };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            rustToolchain
            sd  # string replacer used by release script
            cmake  # needed for audiopus_sys build
            pkg-config  # for finding system libraries
            libopus  # audio codec library for audiopus_sys
          ];

          shellHook = ''
            echo "Oh My Pi development environment"
            echo "Rust toolchain: $(rustc --version)"
            echo "Cargo: $(cargo --version)"
            echo "Rustfmt: $(rustfmt --version)"
            echo "Clippy: $(cargo clippy --version)"
          '';
        };
      }
    );
}
