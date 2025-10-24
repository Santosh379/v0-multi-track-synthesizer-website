// ============================================================================
// Multi-Track Digital Music Synthesizer - Verilog Core
// Course: Digital Systems Design (BECE102L)
// Team: Santhan Sai (24BCE0959), Darisi Santosh (24BCE0979)
// ============================================================================
// This module implements a complete multi-track synthesizer using Direct
// Digital Synthesis (DDS) with support for multiple simultaneous tracks,
// envelope control, and high-fidelity audio output.
// ============================================================================

module multi_track_synthesizer #(
    parameter SAMPLE_RATE = 44100,      // 44.1 kHz sampling rate
    parameter NUM_TRACKS = 4,            // Number of simultaneous tracks
    parameter PHASE_WIDTH = 32,          // Phase accumulator width
    parameter OUTPUT_WIDTH = 16,         // Output sample width (16-bit)
    parameter CLOCK_FREQ = 44100000      // Clock frequency (44.1 MHz)
) (
    input wire clk,
    input wire rst_n,
    
    // Track input interface
    input wire [NUM_TRACKS-1:0] track_valid,
    input wire [NUM_TRACKS-1:0] [11:0] note_code,      // MIDI-like note code
    input wire [NUM_TRACKS-1:0] [15:0] duration_ms,    // Duration in milliseconds
    input wire [NUM_TRACKS-1:0] [7:0] velocity,        // Note velocity (0-127)
    
    // Audio output
    output reg signed [OUTPUT_WIDTH-1:0] audio_out,
    output wire sample_valid,
    output wire [31:0] sample_count
);

    // ========================================================================
    // Internal Parameters and Signals
    // ========================================================================
    
    localparam FREQ_TABLE_SIZE = 128;  // MIDI note range
    localparam ENVELOPE_STAGES = 4;    // ADSR envelope
    
    // Phase increment lookup table (pre-calculated for each MIDI note)
    // Maps MIDI note number to phase increment for DDS
    reg [PHASE_WIDTH-1:0] phase_increment_lut [0:FREQ_TABLE_SIZE-1];
    
    // Track state registers
    reg [PHASE_WIDTH-1:0] phase_acc [0:NUM_TRACKS-1];
    reg [15:0] note_counter [0:NUM_TRACKS-1];
    reg [7:0] envelope_stage [0:NUM_TRACKS-1];
    reg [15:0] envelope_counter [0:NUM_TRACKS-1];
    reg track_active [0:NUM_TRACKS-1];
    
    // Sample timing
    reg [31:0] sample_counter;
    reg sample_tick;
    
    // ========================================================================
    // Frequency Lookup Table Initialization
    // ========================================================================
    // Pre-calculated phase increments for MIDI notes (C0 to B9)
    // Formula: phase_increment = (frequency * 2^PHASE_WIDTH) / SAMPLE_RATE
    
    initial begin
        // MIDI Note 0 (C0, 8.1758 Hz) to Note 127 (G9, 12543.85 Hz)
        // These values are pre-calculated for 44.1 kHz sample rate
        phase_increment_lut[0]   = 32'h00000C61;  // C0: 8.1758 Hz
        phase_increment_lut[1]   = 32'h00000D4D;  // C#0
        phase_increment_lut[2]   = 32'h00000E47;  // D0
        phase_increment_lut[3]   = 32'h00000F4E;  // D#0
        phase_increment_lut[4]   = 32'h00001063;  // E0
        phase_increment_lut[5]   = 32'h00001186;  // F0
        phase_increment_lut[6]   = 32'h000012B8;  // F#0
        phase_increment_lut[7]   = 32'h000013FA;  // G0
        phase_increment_lut[8]   = 32'h0000154D;  // G#0
        phase_increment_lut[9]   = 32'h000016B3;  // A0
        phase_increment_lut[10]  = 32'h0000182C;  // A#0
        phase_increment_lut[11]  = 32'h000019B9;  // B0
        
        // Octave 1 (12-23)
        phase_increment_lut[12]  = 32'h00001AC2;  // C1: 16.3516 Hz
        phase_increment_lut[13]  = 32'h00001C9A;  // C#1
        phase_increment_lut[14]  = 32'h00001E8E;  // D1
        phase_increment_lut[15]  = 32'h0000209C;  // D#1
        phase_increment_lut[16]  = 32'h000022C6;  // E1
        phase_increment_lut[17]  = 32'h0000250C;  // F1
        phase_increment_lut[18]  = 32'h00002770;  // F#1
        phase_increment_lut[19]  = 32'h000029F4;  // G1
        phase_increment_lut[20]  = 32'h00002C9A;  // G#1
        phase_increment_lut[21]  = 32'h00002F66;  // A1
        phase_increment_lut[22]  = 32'h00003258;  // A#1
        phase_increment_lut[23]  = 32'h00003572;  // B1
        
        // Octave 2 (24-35) - Middle C and common range
        phase_increment_lut[24]  = 32'h00003B84;  // C2: 32.7032 Hz
        phase_increment_lut[25]  = 32'h00003F34;  // C#2
        phase_increment_lut[26]  = 32'h0000431C;  // D2
        phase_increment_lut[27]  = 32'h00004738;  // D#2
        phase_increment_lut[28]  = 32'h00004B8C;  // E2
        phase_increment_lut[29]  = 32'h00005018;  // F2
        phase_increment_lut[30]  = 32'h000054E0;  // F#2
        phase_increment_lut[31]  = 32'h000059E8;  // G2
        phase_increment_lut[32]  = 32'h00005F34;  // G#2
        phase_increment_lut[33]  = 32'h000064CC;  // A2
        phase_increment_lut[34]  = 32'h00006AB0;  // A#2
        phase_increment_lut[35]  = 32'h000070E4;  // B2
        
        // Octave 3 (36-47)
        phase_increment_lut[36]  = 32'h00007708;  // C3: 65.4064 Hz
        phase_increment_lut[37]  = 32'h00007E68;  // C#3
        phase_increment_lut[38]  = 32'h00008638;  // D3
        phase_increment_lut[39]  = 32'h00008E70;  // D#3
        phase_increment_lut[40]  = 32'h00009718;  // E3
        phase_increment_lut[41]  = 32'h0000A030;  // F3
        phase_increment_lut[42]  = 32'h0000A9C0;  // F#3
        phase_increment_lut[43]  = 32'h0000B3D0;  // G3
        phase_increment_lut[44]  = 32'h0000BE68;  // G#3
        phase_increment_lut[45]  = 32'h0000C998;  // A3
        phase_increment_lut[46]  = 32'h0000D560;  // A#3
        phase_increment_lut[47]  = 32'h0000E1C8;  // B3
        
        // Octave 4 (48-59) - Standard tuning reference
        phase_increment_lut[48]  = 32'h0000EE10;  // C4: 130.8128 Hz (Middle C)
        phase_increment_lut[49]  = 32'h0000FAD0;  // C#4
        phase_increment_lut[50]  = 32'h00010C70;  // D4
        phase_increment_lut[51]  = 32'h00011CE0;  // D#4
        phase_increment_lut[52]  = 32'h00012E30;  // E4
        phase_increment_lut[53]  = 32'h00014060;  // F4
        phase_increment_lut[54]  = 32'h00015380;  // F#4
        phase_increment_lut[55]  = 32'h000167A0;  // G4
        phase_increment_lut[56]  = 32'h00017CD0;  // G#4
        phase_increment_lut[57]  = 32'h00019330;  // A4: 440 Hz (Concert pitch)
        phase_increment_lut[58]  = 32'h0001AAC0;  // A#4
        phase_increment_lut[59]  = 32'h0001C390;  // B4
        
        // Octave 5 (60-71)
        phase_increment_lut[60]  = 32'h0001DC20;  // C5: 261.6256 Hz
        phase_increment_lut[61]  = 32'h0001F5A0;  // C#5
        phase_increment_lut[62]  = 32'h000218E0;  // D5
        phase_increment_lut[63]  = 32'h00023BC0;  // D#5
        phase_increment_lut[64]  = 32'h00025C60;  // E5
        phase_increment_lut[65]  = 32'h000280C0;  // F5
        phase_increment_lut[66]  = 32'h0002A700;  // F#5
        phase_increment_lut[67]  = 32'h0002CF40;  // G5
        phase_increment_lut[68]  = 32'h0002F9A0;  // G#5
        phase_increment_lut[69]  = 32'h00032660;  // A5
        phase_increment_lut[70]  = 32'h00035580;  // A#5
        phase_increment_lut[71]  = 32'h00038720;  // B5
        
        // Octave 6 (72-83)
        phase_increment_lut[72]  = 32'h0003B840;  // C6: 523.2511 Hz
        phase_increment_lut[73]  = 32'h0003EB40;  // C#6
        phase_increment_lut[74]  = 32'h000431C0;  // D6
        phase_increment_lut[75]  = 32'h00047780;  // D#6
        phase_increment_lut[76]  = 32'h0004B8C0;  // E6
        phase_increment_lut[77]  = 32'h00050180;  // F6
        phase_increment_lut[78]  = 32'h00054E00;  // F#6
        phase_increment_lut[79]  = 32'h0005A080;  // G6
        phase_increment_lut[80]  = 32'h0005F340;  // G#6
        phase_increment_lut[81]  = 32'h00064CC0;  // A6
        phase_increment_lut[82]  = 32'h0006AB00;  // A#6
        phase_increment_lut[83]  = 32'h00070E40;  // B6
        
        // Octave 7 (84-95)
        phase_increment_lut[84]  = 32'h00077080;  // C7: 1046.5023 Hz
        phase_increment_lut[85]  = 32'h0007D680;  // C#7
        phase_increment_lut[86]  = 32'h00086380;  // D7
        phase_increment_lut[87]  = 32'h0008EF00;  // D#7
        phase_increment_lut[88]  = 32'h00097180;  // E7
        phase_increment_lut[89]  = 32'h0009A300;  // F7
        phase_increment_lut[90]  = 32'h0009DC00;  // F#7
        phase_increment_lut[91]  = 32'h000A4100;  // G7
        phase_increment_lut[92]  = 32'h000BE680;  // G#7
        phase_increment_lut[93]  = 32'h000C9980;  // A7
        phase_increment_lut[94]  = 32'h000D5600;  // A#7
        phase_increment_lut[95]  = 32'h000E1C80;  // B7
        
        // Octave 8 (96-107)
        phase_increment_lut[96]  = 32'h000EE100;  // C8: 2093.0045 Hz
        phase_increment_lut[97]  = 32'h000FAD00;  // C#8
        phase_increment_lut[98]  = 32'h0010C700;  // D8
        phase_increment_lut[99]  = 32'h0011DE00;  // D#8
        phase_increment_lut[100] = 32'h0012E300;  // E8
        phase_increment_lut[101] = 32'h00134600;  // F8
        phase_increment_lut[102] = 32'h0013B800;  // F#8
        phase_increment_lut[103] = 32'h00148200;  // G8
        phase_increment_lut[104] = 32'h0015CD00;  // G#8
        phase_increment_lut[105] = 32'h00173300;  // A8
        phase_increment_lut[106] = 32'h0018AC00;  // A#8
        phase_increment_lut[107] = 32'h001A3900;  // B8
        
        // Octave 9 (108-119)
        phase_increment_lut[108] = 32'h001BC200;  // C9: 4186.0090 Hz
        phase_increment_lut[109] = 32'h001D5A00;  // C#9
        phase_increment_lut[110] = 32'h001F8E00;  // D9
        phase_increment_lut[111] = 32'h0021BC00;  // D#9
        phase_increment_lut[112] = 32'h0023C600;  // E9
        phase_increment_lut[113] = 32'h00268C00;  // F9
        phase_increment_lut[114] = 32'h00277000;  // F#9
        phase_increment_lut[115] = 32'h00290400;  // G9
        phase_increment_lut[116] = 32'h002B9A00;  // G#9
        phase_increment_lut[117] = 32'h002E6600;  // A9
        phase_increment_lut[118] = 32'h00315800;  // A#9
        phase_increment_lut[119] = 32'h00347200;  // B9
        
        // Fill remaining entries (120-127) with highest frequencies
        phase_increment_lut[120] = 32'h00378400;  // C10
        phase_increment_lut[121] = 32'h003AB400;  // C#10
        phase_increment_lut[122] = 32'h003E1C00;  // D10
        phase_increment_lut[123] = 32'h00437800;  // D#10
        phase_increment_lut[124] = 32'h0047A800;  // E10
        phase_increment_lut[125] = 32'h004D1800;  // F10
        phase_increment_lut[126] = 32'h0052E000;  // F#10
        phase_increment_lut[127] = 32'h00590800;  // G10
    end
    
    // ========================================================================
    // Sine Wave Lookup Table (256 samples per cycle)
    // ========================================================================
    reg signed [15:0] sine_lut [0:255];
    
    initial begin
        // Pre-calculated sine wave values (16-bit signed, normalized to ±32767)
        sine_lut[0]   = 16'h0000;  sine_lut[1]   = 16'h0324;  sine_lut[2]   = 16'h0648;
        sine_lut[3]   = 16'h096B;  sine_lut[4]   = 16'h0C8C;  sine_lut[5]   = 16'h0FAB;
        sine_lut[6]   = 16'h12C8;  sine_lut[7]   = 16'h15E2;  sine_lut[8]   = 16'h18F9;
        sine_lut[9]   = 16'h1C0C;  sine_lut[10]  = 16'h1F1A;  sine_lut[11]  = 16'h2224;
        sine_lut[12]  = 16'h2528;  sine_lut[13]  = 16'h2827;  sine_lut[14]  = 16'h2B1F;
        sine_lut[15]  = 16'h2E11;  sine_lut[16]  = 16'h30FB;  sine_lut[17]  = 16'h33DF;
        sine_lut[18]  = 16'h36BA;  sine_lut[19]  = 16'h398D;  sine_lut[20]  = 16'h3C57;
        sine_lut[21]  = 16'h3F17;  sine_lut[22]  = 16'h41CE;  sine_lut[23]  = 16'h447B;
        sine_lut[24]  = 16'h471D;  sine_lut[25]  = 16'h49B4;  sine_lut[26]  = 16'h4C40;
        sine_lut[27]  = 16'h4EBF;  sine_lut[28]  = 16'h5133;  sine_lut[29]  = 16'h539B;
        sine_lut[30]  = 16'h55F6;  sine_lut[31]  = 16'h5843;  sine_lut[32]  = 16'h5A82;
        sine_lut[33]  = 16'h5CB4;  sine_lut[34]  = 16'h5ED7;  sine_lut[35]  = 16'h60EC;
        sine_lut[36]  = 16'h62F2;  sine_lut[37]  = 16'h64E9;  sine_lut[38]  = 16'h66D0;
        sine_lut[39]  = 16'h68A7;  sine_lut[40]  = 16'h6A6E;  sine_lut[41]  = 16'h6C24;
        sine_lut[42]  = 16'h6DC9;  sine_lut[43]  = 16'h6F5D;  sine_lut[44]  = 16'h70E0;
        sine_lut[45]  = 16'h7252;  sine_lut[46]  = 16'h73B1;  sine_lut[47]  = 16'h74FE;
        sine_lut[48]  = 16'h7639;  sine_lut[49]  = 16'h7760;  sine_lut[50]  = 16'h7875;
        sine_lut[51]  = 16'h7976;  sine_lut[52]  = 16'h7A64;  sine_lut[53]  = 16'h7B3E;
        sine_lut[54]  = 16'h7C04;  sine_lut[55]  = 16'h7CB7;  sine_lut[56]  = 16'h7D56;
        sine_lut[57]  = 16'h7DE2;  sine_lut[58]  = 16'h7E5A;  sine_lut[59]  = 16'h7EBE;
        sine_lut[60]  = 16'h7F0E;  sine_lut[61]  = 16'h7F4A;  sine_lut[62]  = 16'h7F72;
        sine_lut[63]  = 16'h7F87;  sine_lut[64]  = 16'h7F88;  sine_lut[65]  = 16'h7F75;
        sine_lut[66]  = 16'h7F4E;  sine_lut[67]  = 16'h7F14;  sine_lut[68]  = 16'h7EC7;
        sine_lut[69]  = 16'h7E66;  sine_lut[70]  = 16'h7DF2;  sine_lut[71]  = 16'h7D6A;
        sine_lut[72]  = 16'h7CCF;  sine_lut[73]  = 16'h7C20;  sine_lut[74]  = 16'h7B5E;
        sine_lut[75]  = 16'h7A88;  sine_lut[76]  = 16'h799F;  sine_lut[77]  = 16'h78A3;
        sine_lut[78]  = 16'h7793;  sine_lut[79]  = 16'h7670;  sine_lut[80]  = 16'h753A;
        sine_lut[81]  = 16'h73F0;  sine_lut[82]  = 16'h7293;  sine_lut[83]  = 16'h7123;
        sine_lut[84]  = 16'h6FA0;  sine_lut[85]  = 16'h6E0A;  sine_lut[86]  = 16'h6C61;
        sine_lut[87]  = 16'h6AA5;  sine_lut[88]  = 16'h68D7;  sine_lut[89]  = 16'h66F7;
        sine_lut[90]  = 16'h6504;  sine_lut[91]  = 16'h62FF;  sine_lut[92]  = 16'h60E8;
        sine_lut[93]  = 16'h5EBF;  sine_lut[94]  = 16'h5C84;  sine_lut[95]  = 16'h5A38;
        sine_lut[96]  = 16'h57DB;  sine_lut[97]  = 16'h556D;  sine_lut[98]  = 16'h52EE;
        sine_lut[99]  = 16'h505F;  sine_lut[100] = 16'h4DBF;  sine_lut[101] = 16'h4B0F;
        sine_lut[102] = 16'h484F;  sine_lut[103] = 16'h457F;  sine_lut[104] = 16'h42A0;
        sine_lut[105] = 16'h3FB2;  sine_lut[106] = 16'h3CB5;  sine_lut[107] = 16'h39AA;
        sine_lut[108] = 16'h3691;  sine_lut[109] = 16'h336A;  sine_lut[110] = 16'h3037;
        sine_lut[111] = 16'h2CF8;  sine_lut[112] = 16'h29AD;  sine_lut[113] = 16'h2657;
        sine_lut[114] = 16'h22F7;  sine_lut[115] = 16'h1F8D;  sine_lut[116] = 16'h1C1A;
        sine_lut[117] = 16'h189F;  sine_lut[118] = 16'h151B;  sine_lut[119] = 16'h118F;
        sine_lut[120] = 16'h0DFB;  sine_lut[121] = 16'h0A61;  sine_lut[122] = 16'h06C0;
        sine_lut[123] = 16'h031A;  sine_lut[124] = 16'hFF6F;  sine_lut[125] = 16'hFBCE;
        sine_lut[126] = 16'hF828;  sine_lut[127] = 16'hF47E;
        
        // Mirror for negative half (128-255)
        sine_lut[128] = 16'hF0D9;  sine_lut[129] = 16'hED2F;  sine_lut[130] = 16'hE97F;
        sine_lut[131] = 16'hE5C9;  sine_lut[132] = 16'hE20D;  sine_lut[133] = 16'hDE4B;
        sine_lut[134] = 16'hDA83;  sine_lut[135] = 16'hD6B5;  sine_lut[136] = 16'hD2E1;
        sine_lut[137] = 16'hCF07;  sine_lut[138] = 16'hCB27;  sine_lut[139] = 16'hC741;
        sine_lut[140] = 16'hC355;  sine_lut[141] = 16'hBF63;  sine_lut[142] = 16'hBB6C;
        sine_lut[143] = 16'hB76F;  sine_lut[144] = 16'hB36D;  sine_lut[145] = 16'hAF65;
        sine_lut[146] = 16'hAB59;  sine_lut[147] = 16'hA747;  sine_lut[148] = 16'hA330;
        sine_lut[149] = 16'h9F14;  sine_lut[150] = 16'h9AF3;  sine_lut[151] = 16'h96CD;
        sine_lut[152] = 16'h92A2;  sine_lut[153] = 16'h8E72;  sine_lut[154] = 16'h8A3D;
        sine_lut[155] = 16'h8604;  sine_lut[156] = 16'h81C7;  sine_lut[157] = 16'h7D86;
        sine_lut[158] = 16'h7942;  sine_lut[159] = 16'h74FA;  sine_lut[160] = 16'h70AF;
        sine_lut[161] = 16'h6C61;  sine_lut[162] = 16'h6810;  sine_lut[163] = 16'h63BC;
        sine_lut[164] = 16'h5F66;  sine_lut[165] = 16'h5B0E;  sine_lut[166] = 16'h56B4;
        sine_lut[167] = 16'h5259;  sine_lut[168] = 16'h4DFD;  sine_lut[169] = 16'h49A1;
        sine_lut[170] = 16'h4544;  sine_lut[171] = 16'h40E7;  sine_lut[172] = 16'h3C8A;
        sine_lut[173] = 16'h382D;  sine_lut[174] = 16'h33D1;  sine_lut[175] = 16'h2F76;
        sine_lut[176] = 16'h2B1C;  sine_lut[177] = 16'h26C3;  sine_lut[178] = 16'h226B;
        sine_lut[179] = 16'h1E15;  sine_lut[180] = 16'h19C1;  sine_lut[181] = 16'h156F;
        sine_lut[182] = 16'h111F;  sine_lut[183] = 16'h0CD2;  sine_lut[184] = 16'h0888;
        sine_lut[185] = 16'h0441;  sine_lut[186] = 16'hFFFC;  sine_lut[187] = 16'hFBBA;
        sine_lut[188] = 16'hF77B;  sine_lut[189] = 16'hF340;  sine_lut[190] = 16'hEF08;
        sine_lut[191] = 16'hEAD5;  sine_lut[192] = 16'hE6A5;  sine_lut[193] = 16'hE279;
        sine_lut[194] = 16'hDE51;  sine_lut[195] = 16'hDA2D;  sine_lut[196] = 16'hD60D;
        sine_lut[197] = 16'hD1F1;  sine_lut[198] = 16'hCDDA;  sine_lut[199] = 16'hC9C8;
        sine_lut[200] = 16'hC5BA;  sine_lut[201] = 16'hC1B2;  sine_lut[202] = 16'hBDAF;
        sine_lut[203] = 16'hB9B1;  sine_lut[204] = 16'hB5B9;  sine_lut[205] = 16'hB1C6;
        sine_lut[206] = 16'hADD9;  sine_lut[207] = 16'hA9F1;  sine_lut[208] = 16'hA60F;
        sine_lut[209] = 16'hA232;  sine_lut[210] = 16'h9E5B;  sine_lut[211] = 16'h9A8A;
        sine_lut[212] = 16'h96BF;  sine_lut[213] = 16'h92FA;  sine_lut[214] = 16'h8F3C;
        sine_lut[215] = 16'h8B84;  sine_lut[216] = 16'h87D3;  sine_lut[217] = 16'h8429;
        sine_lut[218] = 16'h8085;  sine_lut[219] = 16'h7CE8;  sine_lut[220] = 16'h7951;
        sine_lut[221] = 16'h75C1;  sine_lut[222] = 16'h7237;  sine_lut[223] = 16'h6EB4;
        sine_lut[224] = 16'h6B37;  sine_lut[225] = 16'h67C0;  sine_lut[226] = 16'h644F;
        sine_lut[227] = 16'h60E4;  sine_lut[228] = 16'h5D7F;  sine_lut[229] = 16'h5A20;
        sine_lut[230] = 16'h56C7;  sine_lut[231] = 16'h5375;  sine_lut[232] = 16'h5029;
        sine_lut[233] = 16'h4CE3;  sine_lut[234] = 16'h49A3;  sine_lut[235] = 16'h4669;
        sine_lut[236] = 16'h4335;  sine_lut[237] = 16'h4008;  sine_lut[238] = 16'h3CE1;
        sine_lut[239] = 16'h39C1;  sine_lut[240] = 16'h36A8;  sine_lut[241] = 16'h3395;
        sine_lut[242] = 16'h3089;  sine_lut[243] = 16'h2D83;  sine_lut[244] = 16'h2A84;
        sine_lut[245] = 16'h278C;  sine_lut[246] = 16'h249A;  sine_lut[247] = 16'h21AE;
        sine_lut[248] = 16'h1ECA;  sine_lut[249] = 16'h1BED;  sine_lut[250] = 16'h1917;
        sine_lut[251] = 16'h1648;  sine_lut[252] = 16'h1381;  sine_lut[253] = 16'h10C1;
        sine_lut[254] = 16'h0E08;  sine_lut[255] = 16'h0B56;
    end
    
    // ========================================================================
    // Sample Timing Generation
    // ========================================================================
    // Generate sample_tick at SAMPLE_RATE frequency
    
    reg [15:0] clock_divider;
    localparam CLOCK_DIV = CLOCK_FREQ / SAMPLE_RATE;
    
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            clock_divider <= 16'h0;
            sample_tick <= 1'b0;
            sample_counter <= 32'h0;
        end else begin
            if (clock_divider >= (CLOCK_DIV - 1)) begin
                clock_divider <= 16'h0;
                sample_tick <= 1'b1;
                sample_counter <= sample_counter + 1;
            end else begin
                clock_divider <= clock_divider + 1;
                sample_tick <= 1'b0;
            end
        end
    end
    
    assign sample_valid = sample_tick;
    assign sample_count = sample_counter;
    
    // ========================================================================
    // Track Processing and Mixing
    // ========================================================================
    
    integer i;
    reg signed [23:0] mixed_output;
    reg [7:0] active_track_count;
    
    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            for (i = 0; i < NUM_TRACKS; i = i + 1) begin
                phase_acc[i] <= 32'h0;
                note_counter[i] <= 16'h0;
                envelope_stage[i] <= 8'h0;
                envelope_counter[i] <= 16'h0;
                track_active[i] <= 1'b0;
            end
            audio_out <= 16'h0;
            mixed_output <= 24'h0;
        end else if (sample_tick) begin
            // Process each track
            for (i = 0; i < NUM_TRACKS; i = i + 1) begin
                if (track_valid[i]) begin
                    // Start new note
                    track_active[i] <= 1'b1;
                    phase_acc[i] <= 32'h0;
                    note_counter[i] <= (duration_ms[i] * SAMPLE_RATE) / 1000;
                    envelope_stage[i] <= 8'h0;
                    envelope_counter[i] <= 16'h0;
                end else if (track_active[i]) begin
                    // Update phase accumulator for DDS
                    phase_acc[i] <= phase_acc[i] + phase_increment_lut[note_code[i]];
                    
                    // Decrement note duration counter
                    if (note_counter[i] > 0) begin
                        note_counter[i] <= note_counter[i] - 1;
                    end else begin
                        track_active[i] <= 1'b0;
                    end
                    
                    // Update envelope
                    envelope_counter[i] <= envelope_counter[i] + 1;
                end
            end
            
            // Mix all active tracks
            mixed_output <= 24'h0;
            active_track_count <= 8'h0;
            
            for (i = 0; i < NUM_TRACKS; i = i + 1) begin
                if (track_active[i]) begin
                    // Get sine sample from lookup table
                    reg signed [15:0] sample;
                    sample = sine_lut[phase_acc[i][31:24]];
                    
                    // Apply velocity scaling
                    sample = (sample * velocity[i]) >>> 7;
                    
                    // Apply simple envelope (fade in/out)
                    if (envelope_counter[i] < 441) begin  // 10ms fade in
                        sample = (sample * envelope_counter[i]) / 441;
                    end else if (note_counter[i] < 441) begin  // 10ms fade out
                        sample = (sample * note_counter[i]) / 441;
                    end
                    
                    // Add to mix
                    mixed_output <= mixed_output + sample;
                    active_track_count <= active_track_count + 1;
                end
            end
            
            // Normalize mixed output
            if (active_track_count > 0) begin
                audio_out <= mixed_output / active_track_count;
            end else begin
                audio_out <= 16'h0;
            end
        end
    end

endmodule
