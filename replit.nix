{pkgs}: {
  deps = [
    pkgs.xorg.libXext
    pkgs.xorg.libXi
    pkgs.xorg.libX11
    pkgs.pkg-config
    pkgs.postgresql
  ];
}
