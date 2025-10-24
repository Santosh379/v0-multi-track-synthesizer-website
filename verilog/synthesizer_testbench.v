// ============================================================================
// Multi-Track Synthesizer Testbench
// ============================================================================
// This testbench generates a sequence of musical notes and captures the
// output samples to a file for Python processing.
// ============================================================================

`timescale 1ns / 1ps

module synthesizer_testbench;

    // Parameters
    localparam SAMPLE_RATE = 44100;
    localparam NUM_TRACKS = 4;
    localparam CLOCK_FREQ = 44100000;  // 44.1 MHz
    localparam CLOCK_PERIOD = 1000000000 / CLOCK_FREQ;  // in ns
    
    // Signals
    reg clk;
    reg rst_n;
    reg [NUM_TRACKS-1:0] track_valid;
    reg [NUM_TRACKS-1:0] [11:0] note_code;
    reg [NUM_TRACKS-1:0] [15:0] duration_ms;
    reg [NUM_TRACKS-1:0] [7:0] velocity;
    
    wire signed [15:0] audio_out;
    wire sample_valid;
    wire [31:0] sample_count;
    
    // File handle for output
    integer output_file;
    
    // Instantiate the synthesizer
    multi_track_synthesizer #(
        .SAMPLE_RATE(SAMPLE_RATE),
        .NUM_TRACKS(NUM_TRACKS),
        .CLOCK_FREQ(CLOCK_FREQ)
    ) dut (
        .clk(clk),
        .rst_n(rst_n),
        .track_valid(track_valid),
        .note_code(note_code),
        .duration_ms(duration_ms),
        .velocity(velocity),
        .audio_out(audio_out),
        .sample_valid(sample_valid),
        .sample_count(sample_count)
    );
    
    // Clock generation
    initial begin
        clk = 1'b0;
        forever #(CLOCK_PERIOD/2) clk = ~clk;
    end
    
    // Test sequence
    initial begin
        // Open output file
        output_file = $fopen("audio_samples.txt", "w");
        
        // Initialize
        rst_n = 1'b0;
        track_valid = 4'b0000;
        note_code = 48'h000000000000;
        duration_ms = 64'h0000000000000000;
        velocity = 32'h7F7F7F7F;
        
        #(10 * CLOCK_PERIOD);
        rst_n = 1'b1;
        
        // Play a simple melody: C4, D4, E4, F4, G4 (notes 48-52)
        // Each note plays for 500ms
        
        // Note 1: C4 (MIDI 48)
        track_valid = 4'b0001;
        note_code[0] = 12'd48;
        duration_ms[0] = 16'd500;
        velocity[0] = 8'd127;
        #(CLOCK_PERIOD);
        track_valid = 4'b0000;
        
        #(550 * SAMPLE_RATE * CLOCK_PERIOD);
        
        // Note 2: D4 (MIDI 50)
        track_valid = 4'b0001;
        note_code[0] = 12'd50;
        duration_ms[0] = 16'd500;
        #(CLOCK_PERIOD);
        track_valid = 4'b0000;
        
        #(550 * SAMPLE_RATE * CLOCK_PERIOD);
        
        // Note 3: E4 (MIDI 52)
        track_valid = 4'b0001;
        note_code[0] = 12'd52;
        duration_ms[0] = 16'd500;
        #(CLOCK_PERIOD);
        track_valid = 4'b0000;
        
        #(550 * SAMPLE_RATE * CLOCK_PERIOD);
        
        // Note 4: F4 (MIDI 53)
        track_valid = 4'b0001;
        note_code[0] = 12'd53;
        duration_ms[0] = 16'd500;
        #(CLOCK_PERIOD);
        track_valid = 4'b0000;
        
        #(550 * SAMPLE_RATE * CLOCK_PERIOD);
        
        // Note 5: G4 (MIDI 55)
        track_valid = 4'b0001;
        note_code[0] = 12'd55;
        duration_ms[0] = 16'd500;
        #(CLOCK_PERIOD);
        track_valid = 4'b0000;
        
        #(550 * SAMPLE_RATE * CLOCK_PERIOD);
        
        $fclose(output_file);
        $finish;
    end
    
    // Capture samples
    always @(posedge clk) begin
        if (sample_valid) begin
            $fwrite(output_file, "%d\n", audio_out);
        end
    end

endmodule
